import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Upload, FileText, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react'

const requiredDocs = [
  { key: 'driver_license', label: "Driver's License", accept: 'Passport, SSS ID, PhilHealth, Postal ID, Voter\'s ID' },
  { key: 'valid_id', label: 'Other Valid ID', accept: 'Passport, SSS ID, PhilHealth, Postal ID, Voter\'s ID, etc.' },
  { key: 'proof_of_billing', label: 'Proof of Billing', accept: 'Electricity, water, internet, or phone bill (within 3 months)' },
]

export default function RegistrationDocuments() {
  const [uploads, setUploads] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()

  const handleUpload = async (key: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading((prev) => ({ ...prev, [key]: true }))
      // ponytail: actual upload to Supabase storage
      await new Promise((r) => setTimeout(r, 1200))
      setUploads((prev) => ({ ...prev, [key]: file.name }))
      setUploading((prev) => ({ ...prev, [key]: false }))
    }
    input.click()
  }

  const allUploaded = requiredDocs.every((d) => uploads[d.key])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f9ff] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-[520px]">
        <a href="/" className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back home
        </a>

        <div className="rounded-[28px] border border-[#071f52]/10 bg-white p-8 shadow-[0_20px_60px_rgba(7,31,82,0.14)]">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
            <ShieldCheck size={15} />
            Step 2 of 2
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#071f52]">Upload documents</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-[#071f52]/58">
            These are required for Self Drive bookings. Each document is saved automatically as soon as you add it.
          </p>

          <div className="mt-6 space-y-3">
            {requiredDocs.map((doc) => (
              <div key={doc.key} className="rounded-2xl border border-[#071f52]/10 bg-[#f7f9ff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#071f52]">{doc.label}</p>
                    <p className="mt-0.5 text-xs font-medium text-[#071f52]/48">{doc.accept}</p>
                  </div>
                  {uploads[doc.key] ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="shrink-0 text-[#16a34a]" />
                      <span className="text-xs font-bold text-[#16a34a]">Uploaded</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpload(doc.key)}
                      disabled={uploading[doc.key]}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#071f52] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#112458] disabled:opacity-50"
                    >
                      {uploading[doc.key] ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Upload
                    </button>
                  )}
                </div>
                {uploads[doc.key] && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-[#071f52]/58">
                    <FileText size={14} />
                    {uploads[doc.key]}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate('/dashboard')}
            disabled={!allUploaded}
            className="mt-6 w-full bg-[#e92935] text-white hover:bg-[#c91f2a] disabled:opacity-40"
            size="lg"
          >
            {allUploaded ? 'Go to dashboard' : 'Upload all documents to continue'}
          </Button>

          <p className="mt-4 text-center text-xs font-medium leading-5 text-[#071f52]/48">
            Each document is saved automatically as soon as you add it — there is no Save button. You can upload them one at a time, even on a slow connection.
          </p>
        </div>
      </div>
    </div>
  )
}
