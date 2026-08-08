import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Compass, MapPin, ShieldCheck, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { useCustomerDocuments, useSaveCustomerDocument } from '@/hooks/use-documents'
import { composeProfileAddress, parseProfileAddress } from '@/lib/profile-address'
import { showError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import type { DocumentType } from '@/types/document'

type Step = 'personal' | 'address' | 'self-drive' | 'documents' | 'complete'

type FormValues = {
  first_name: string
  last_name: string
  mobile: string
  address_line_1: string
  address_line_2: string
  street_address: string
  barangay: string
  city: string
  province: string
  zip_code: string
  country: string
}

const onboardingDocuments = [
  { key: 'driver_license' as const, label: "Driver's License" },
  { key: 'valid_id' as const, label: 'Valid ID' },
]

const personalFields: Array<{ key: keyof FormValues; label: string }> = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'mobile', label: 'Phone Number' },
]

const addressFields: Array<{ key: keyof FormValues; label: string; wide?: boolean; optional?: boolean }> = [
  { key: 'address_line_1', label: 'Address Line 1', wide: true },
  { key: 'address_line_2', label: 'Address Line 2', wide: true, optional: true },
  { key: 'street_address', label: 'Street Address' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'zip_code', label: 'ZIP Code' },
  { key: 'country', label: 'Country' },
]

const MOBILE_PREFIX = '+63 '

function normalize(value: string | null | undefined) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function getMobileDigits(value: string) {
  const digits = value.replace(/^\+63\s*/, '')
  return digits.replace(/\D/g, '')
}

function getPersonalFields(values: FormValues) {
  return getMobileDigits(values.mobile).length === 10
    ? personalFields.filter((field) => field.key !== 'mobile')
    : personalFields
}

function profileValues(profile: NonNullable<ReturnType<typeof useProfile>['data']>): FormValues {
  const address = parseProfileAddress(profile.address)
  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    mobile: profile.mobile || MOBILE_PREFIX,
    address_line_1: profile.address_line_1 || address.address_line_1,
    address_line_2: profile.address_line_2 || address.address_line_2,
    street_address: profile.street_address || address.street_address,
    barangay: profile.barangay || address.barangay,
    city: profile.city || '',
    province: profile.province || '',
    zip_code: profile.zip_code || '',
    country: profile.country || '',
  }
}

function getInvalidFields(values: FormValues, fields: Array<{ key: keyof FormValues; optional?: boolean }>) {
  return fields.reduce<string[]>((mismatches, field) => {
    const invalid = field.key === 'mobile'
      ? getMobileDigits(values[field.key]).length !== 10
      : !field.optional && !normalize(values[field.key])
    if (invalid) mismatches.push(field.key)
    return mismatches
  }, [])
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id)
  const updateProfile = useUpdateProfile()
  const { data: documents = [], isLoading: documentsLoading } = useCustomerDocuments(user?.id)
  const saveDocument = useSaveCustomerDocument(user?.id)
  const [step, setStep] = useState<Step>('personal')
  const [values, setValues] = useState<FormValues | null>(null)
  const [mismatches, setMismatches] = useState<string[]>([])
  const [activeDocument, setActiveDocument] = useState<DocumentType | null>(null)
  const [uploading, setUploading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) setValues(profileValues(profile))
  }, [profile])

  const documentsByType = Object.fromEntries(documents.map((document) => [document.document_type, document]))
  const canContinueDocuments = onboardingDocuments.every(({ key }) => {
    const document = documentsByType[key]
    return document && ['submitted', 'verified'].includes(document.status) && document.file_path
  })
  const stepNumber = step === 'personal' ? 1 : step === 'address' ? 2 : step === 'self-drive' ? 3 : step === 'documents' ? 4 : 5

  const validateSection = (fields: Array<{ key: keyof FormValues }>) => {
    if (!values) return false
    const nextMismatches = getInvalidFields(values, fields)
    setMismatches(nextMismatches)
    return !nextMismatches.length
  }

  const continuePersonal = () => {
    if (values && validateSection(getPersonalFields(values))) {
      setMismatches([])
      setStep('address')
    }
  }

  const continueAddress = async () => {
    if (!values || !user || !validateSection(addressFields)) return

    try {
      await updateProfile.mutateAsync({
        id: user.id,
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          mobile: values.mobile,
          address_line_1: values.address_line_1,
          address_line_2: values.address_line_2,
          street_address: values.street_address,
          barangay: values.barangay,
          address: composeProfileAddress(values),
          city: values.city,
          province: values.province,
          zip_code: values.zip_code,
          country: values.country,
        },
      })
      setMismatches([])
      setStep('self-drive')
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeDocument || !user) return
    setUploading(true)
    const extension = file.name.split('.').pop() || 'bin'
    const path = `${user.id}/${activeDocument}.${extension}`

    try {
      const { error } = await supabase.storage.from('customer-documents').upload(path, file, { upsert: true })
      if (error) throw error
      await saveDocument.mutateAsync({
        customer_id: user.id,
        document_type: activeDocument,
        file_path: path,
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      })
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setUploading(false)
      setActiveDocument(null)
      event.target.value = ''
    }
  }

  const completeOnboarding = async () => {
    if (!user) return
    setCompleting(true)
    try {
      await updateProfile.mutateAsync({ id: user.id, data: { onboarding_completed: true } })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.error(showError(error as Error))
      setCompleting(false)
    }
  }

  if (profileLoading || !values) return <OnboardingLoading />

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#071f52] text-[#071f52] lg:h-[100dvh] lg:overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_10%_10%,rgba(255,217,35,0.26),transparent_30%),radial-gradient(circle_at_85%_90%,rgba(233,41,53,0.28),transparent_36%)]" />
      <div className="relative mx-auto grid h-full max-w-[1440px] lg:grid-cols-[0.88fr_1.12fr]">
        <VisualPanel />

        <main className="flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-[#f7f9ff] px-3 py-4 sm:px-6 sm:py-6 lg:min-h-0 lg:items-center lg:rounded-l-[40px] lg:px-8 lg:py-8">
          <div className="w-full max-w-[600px]">
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-[#071f52]/58 hover:text-[#e92935] sm:text-sm"><ArrowLeft size={15} /> Exit onboarding</Link>
              <span className="text-xs font-black text-[#071f52]/42">{stepNumber} of 5</span>
            </div>

            <div className="rounded-[26px] border border-[#071f52]/10 bg-white p-5 shadow-[0_20px_60px_rgba(7,31,82,0.1)] sm:rounded-[30px] sm:p-8">
              <Progress stepNumber={stepNumber} />
              {step === 'personal' && <PersonalStep values={values} mismatches={mismatches} onChange={setValues} onContinue={continuePersonal} />}
              {step === 'address' && <AddressStep values={values} mismatches={mismatches} saving={updateProfile.isPending} onChange={setValues} onBack={() => { setMismatches([]); setStep('personal') }} onContinue={continueAddress} />}
              {step === 'self-drive' && <ChoiceStep onBack={() => setStep('address')} onChoose={(answer) => setStep(answer ? 'documents' : 'complete')} />}
              {step === 'documents' && <DocumentsStep documentsByType={documentsByType} loading={documentsLoading} uploading={uploading} fileInputRef={fileInputRef} onUpload={(key) => { setActiveDocument(key); fileInputRef.current?.click() }} onFileChange={handleFileChange} canContinue={canContinueDocuments} onBack={() => setStep('self-drive')} onContinue={() => setStep('complete')} />}
              {step === 'complete' && <CompletionStep completing={completing} onDashboard={completeOnboarding} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function VisualPanel() {
  return (
    <section className="relative hidden min-h-0 overflow-hidden px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
      <div>
        <div className="flex items-center gap-3"><img src="/logo.jpg" alt="Katada Van Rentals" className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white/20" /><span className="text-sm font-black tracking-tight">Katada Van Rentals</span></div>
        <div className="mt-20 max-w-[420px]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd923]">A smoother start</p>
          <h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.06em] xl:text-6xl">Set the trip in motion.</h1>
          <p className="mt-6 max-w-[360px] text-sm font-medium leading-7 text-white/62">A few details now means faster van requests later. Your account stays in your hands at every step.</p>
        </div>
      </div>
    </section>
  )
}

function Progress({ stepNumber }: { stepNumber: number }) {
  return <div className="mb-6 flex gap-1.5" aria-label={`Onboarding step ${stepNumber} of 5`}>{[1, 2, 3, 4, 5].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= stepNumber ? 'bg-[#e92935]' : 'bg-[#071f52]/10'}`} />)}</div>
}

function PersonalStep({ values, mismatches, onChange, onContinue }: { values: FormValues; mismatches: string[]; onChange: (values: FormValues) => void; onContinue: () => void }) {
  const fields = getPersonalFields(values)

  return <FormStep title="Tell us about you" description="Start with the details we will use to identify your account." mismatches={mismatches} onSubmit={onContinue}>
    <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <Field key={field.key} field={field} values={values} invalid={mismatches.includes(field.key)} onChange={onChange} wide={field.key === 'mobile'} />)}</div>
  </FormStep>
}

function AddressStep({ values, mismatches, saving, onChange, onBack, onContinue }: { values: FormValues; mismatches: string[]; saving: boolean; onChange: (values: FormValues) => void; onBack: () => void; onContinue: () => void }) {
  return <FormStep title="Where can we find you?" description="Add your address so we can prepare your rental details." mismatches={mismatches} onSubmit={onContinue}>
    <div className="grid gap-4 sm:grid-cols-2">{addressFields.map((field) => <Field key={field.key} field={field} values={values} invalid={mismatches.includes(field.key)} onChange={onChange} wide={field.wide} optional={field.optional} />)}</div>
    <div className="mt-6 flex gap-3"><Button type="button" variant="outline" onClick={onBack} className="flex-1" size="lg">Back</Button><Button type="submit" disabled={saving} className="flex-1 bg-[#071f52] text-white hover:bg-[#112458]" size="lg">{saving ? 'Saving...' : 'Continue'}</Button></div>
  </FormStep>
}

function FormStep({ title, description, mismatches, onSubmit, children }: { title: string; description: string; mismatches: string[]; onSubmit: () => void; children: ReactNode }) {
  return <form noValidate onSubmit={(event) => { event.preventDefault(); onSubmit() }}><StepHeading title={title} description={description} />{mismatches.length > 0 && <p className="mt-4 rounded-2xl border border-[#e92935]/25 bg-[#e92935]/8 px-4 py-3 text-xs font-bold leading-5 text-[#b91c1c]">Please fill in the highlighted required fields before continuing.</p>}<div className="mt-6">{children}</div>{title === 'Tell us about you' && <Button type="submit" className="mt-6 w-full bg-[#071f52] text-white hover:bg-[#112458]" size="lg">Continue</Button>}</form>
}

function Field({ field, values, invalid, onChange, wide, optional }: { field: { key: keyof FormValues; label: string }; values: FormValues; invalid: boolean; onChange: (values: FormValues) => void; wide?: boolean; optional?: boolean }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="text-xs font-bold text-[#071f52]">{field.label} {optional ? <span className="font-medium text-[#071f52]/38">(optional)</span> : <span className="text-[#e92935]">*</span>}</span><input value={values[field.key]} aria-label={field.label} aria-invalid={invalid} inputMode={field.key === 'mobile' ? 'numeric' : undefined} maxLength={field.key === 'mobile' ? MOBILE_PREFIX.length + 10 : undefined} onChange={(event) => onChange({ ...values, [field.key]: field.key === 'mobile' ? `${MOBILE_PREFIX}${getMobileDigits(event.target.value).slice(0, 10)}` : event.target.value })} className={`mt-1.5 block w-full rounded-xl border bg-[#f7f9ff] px-3 py-2.5 text-sm font-semibold text-[#071f52] outline-none transition-colors focus:bg-white focus:ring-2 ${invalid ? 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/20' : 'border-[#071f52]/14 focus:border-[#071f52] focus:ring-[#ffd923]/60'}`} />{invalid && <span className="mt-1 block text-[11px] font-bold text-[#b91c1c]">{field.key === 'mobile' ? 'Enter a complete +63 phone number.' : `${field.label} is required.`}</span>}</label>
}

function ChoiceStep({ onBack, onChoose }: { onBack: () => void; onChoose: (answer: boolean) => void }) {
  return <div><StepHeading title="What kind of trip are you planning?" description="Choose whether you want to drive the van yourself." /><div className="mt-6 space-y-3"><ChoiceButton icon={<Compass size={19} />} label="I need a driver" onClick={() => onChoose(false)} /><ChoiceButton icon={<MapPin size={19} />} label="I'm looking to self drive" onClick={() => onChoose(true)} /></div><button type="button" onClick={onBack} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#071f52]/58 hover:text-[#e92935]"><ArrowLeft size={14} /> Back</button></div>
}

function ChoiceButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-[#071f52]/12 bg-[#f7f9ff] px-4 py-4 text-left text-sm font-bold text-[#071f52] transition-all hover:-translate-y-0.5 hover:border-[#071f52] hover:bg-white hover:shadow-[0_8px_20px_rgba(7,31,82,0.08)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffd923]/70">{icon}</span><span>{label}</span><span className="ml-auto text-[#071f52]/30">→</span></button>
}

function DocumentsStep({ documentsByType, loading, uploading, fileInputRef, onUpload, onFileChange, canContinue, onBack, onContinue }: { documentsByType: Record<string, { original_filename: string | null; status: string; file_path: string }>; loading: boolean; uploading: boolean; fileInputRef: React.RefObject<HTMLInputElement | null>; onUpload: (type: DocumentType) => void; onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void; canContinue: boolean; onBack: () => void; onContinue: () => void }) {
  return <div><StepHeading title="Bring the essentials" description="Self-drive rentals require both documents below. Each upload is saved automatically." /><input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={onFileChange} className="hidden" aria-label="Upload document file" /><div className="mt-6 space-y-3">{onboardingDocuments.map(({ key, label }) => { const document = documentsByType[key]; const uploaded = document && ['submitted', 'verified'].includes(document.status) && document.file_path; return <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-[#071f52]/10 bg-[#f7f9ff] p-4"><div className="min-w-0"><p className="text-sm font-bold text-[#071f52]">{label}</p><p className="mt-1 truncate text-xs font-medium text-[#071f52]/48">{uploaded ? document.original_filename : 'Not uploaded'}</p></div>{uploaded ? <CheckCircle2 className="shrink-0 text-[#16a34a]" size={20} /> : <button type="button" onClick={() => onUpload(key)} disabled={loading || uploading} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#071f52] px-3 py-2 text-xs font-bold text-white hover:bg-[#112458] disabled:opacity-50"><Upload size={13} /> Upload</button>}</div> })}</div><div className="mt-6 flex gap-3"><Button type="button" variant="outline" onClick={onBack} className="flex-1" size="lg">Back</Button><Button type="button" onClick={onContinue} disabled={!canContinue || loading || uploading} className="flex-1 bg-[#071f52] text-white hover:bg-[#112458]" size="lg">Continue</Button></div></div>
}

function CompletionStep({ completing, onDashboard }: { completing: boolean; onDashboard: () => void }) {
  return <div className="py-6 text-center sm:py-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd923] text-[#16a34a]"><CheckCircle2 size={32} /></div><h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-[#071f52]">Welcome to Katada Van Rentals!!</h1><p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#071f52]/58">Your onboarding is complete. You can now explore available vans and manage your bookings.</p><Button type="button" onClick={onDashboard} disabled={completing} className="mt-7 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">{completing ? 'Opening dashboard...' : 'Go to dashboard'}</Button></div>
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return <><div className="inline-flex items-center gap-2 rounded-full bg-[#ffd923]/70 px-3 py-1.5 text-[10px] font-black text-[#071f52] sm:px-4 sm:py-2 sm:text-xs"><ShieldCheck size={15} /> Profile setup</div><h1 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#071f52] sm:text-3xl">{title}</h1><p className="mt-2 text-sm font-medium leading-6 text-[#071f52]/58">{description}</p></>
}

function OnboardingLoading() {
  return <div className="flex h-[100dvh] items-center justify-center bg-[#f7f9ff]"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#071f52]/15 border-t-[#071f52]" /></div>
}
