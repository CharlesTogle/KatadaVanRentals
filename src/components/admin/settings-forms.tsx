import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { UPLOAD_POLICIES } from '@/config/constants'
import { queueUploadedFileCleanup, removeUploadedFile, removeUploadedFileByUrl, removeUploadedFileByUrlWithQueue, removeUploadedFileWithQueue, uploadFile } from '@/services/upload-service'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { getAllPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from '@/services/payment-method-service'
import { suggestLocations } from '@/services/location-service'
import { useServiceAreas, useCreateServiceArea, useUpdateServiceArea, useDeleteServiceArea } from '@/hooks/use-service-areas'
import type { PaymentMethod, PaymentChannel } from '@/types/payment'
import type { LocationSuggestion, ServiceArea } from '@/types/location'
import { MapPin } from 'lucide-react'
import { ServiceAreaMap } from '@/components/admin/service-area-map'
import { getPhilippineMobileDigits, normalizePhilippineMobile } from '@/lib/validation'
import { logError, getRequestId } from '@/lib/logger'

const inputClass = 'block w-full rounded-xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
const labelClass = 'text-xs font-bold text-[#071f52]'
const sectionTitleClass = 'text-base font-black text-[#071f52]'
const sectionDescClass = 'text-xs font-medium text-[#071f52]/58'

const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMMM D, YYYY', 'D MMMM YYYY']
const timeFormats = ['12-hour (1:00 PM)', '24-hour (13:00)']

interface SettingsFormProps {
  user: NonNullable<ReturnType<typeof import('@/contexts/useAuth').useAuth>['user']>
  saving: boolean
  setSaving: (v: boolean) => void
  showMessage: (msg: string, type: 'success' | 'error') => void
}

interface SettingsProfileFormProps extends SettingsFormProps {
  profile?: Awaited<ReturnType<typeof import('@/services/profile-service').getProfile>>
}

export function SettingsProfileForm({ user, profile, saving, setSaving, showMessage }: SettingsProfileFormProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [email] = useState(user.email || '')
  const [phone, setPhone] = useState(profile?.mobile ? normalizePhilippineMobile(profile.mobile) : '+63')
  const [profilePicture, setProfilePicture] = useState<string | null>(profile?.profile_image_path || null)
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeFormat, setTimeFormat] = useState('12-hour (1:00 PM)')

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setPhone(profile.mobile ? normalizePhilippineMobile(profile.mobile) : '+63')
      setProfilePicture(profile.profile_image_path || null)
    }
  }, [profile])

  useEffect(() => {
    supabase.from('app_settings').select('timezone,date_format,time_format').single().then(({ data }) => {
      if (data) {
        if (data.timezone) setTimezone(data.timezone)
        if (data.date_format) setDateFormat(data.date_format)
        if (data.time_format) setTimeFormat(data.time_format)
      }
    })
  }, [])

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `admin-photos/${user.id}-${crypto.randomUUID()}.${ext}`
    try {
      if (uploadedPhotoPath) {
        try {
          await removeUploadedFileWithQueue('business-assets', uploadedPhotoPath)
        } catch (cleanupError) {
          logError('settings', 'Failed to remove previous pending profile photo', cleanupError)
          throw cleanupError
        }
      }
      await uploadFile({ bucket: 'business-assets', file, path, policy: UPLOAD_POLICIES.businessAssets, upsert: true })
      setUploadedPhotoPath(path)
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(path)
      setProfilePicture(publicUrl)
    } catch (error) {
      showMessage(showError(error as Error), 'error')
    }
    setUploading(false)
  }

  const handleRemovePhoto = async () => {
    if (uploadedPhotoPath) {
      try {
        await removeUploadedFile('business-assets', uploadedPhotoPath)
        setUploadedPhotoPath(null)
      } catch (error) {
        await queueUploadedFileCleanup('business-assets', uploadedPhotoPath).catch((queueError) => {
          logError('settings', 'Failed to queue profile photo cleanup', queueError)
        })
        showMessage(showError(error), 'error')
        return
      }
    }
    setProfilePicture(null)
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const previousPicture = profile?.profile_image_path || null
      const { error } = await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        mobile: normalizePhilippineMobile(phone),
        profile_image_path: profilePicture,
      }).eq('id', user.id)
      if (error) {
        if (uploadedPhotoPath) await removeUploadedFile('business-assets', uploadedPhotoPath).catch(async (cleanupError) => {
          logError('settings', 'Failed to remove profile photo after metadata failure', cleanupError)
          await queueUploadedFileCleanup('business-assets', uploadedPhotoPath).catch((queueError) => {
            logError('settings', 'Failed to queue profile photo cleanup after metadata failure', queueError)
          })
        })
        showMessage(showError(error), 'error')
        setSaving(false)
        return
      }
      if (previousPicture && previousPicture !== profilePicture) await removeUploadedFileByUrl('business-assets', previousPicture).catch(async (cleanupError) => {
        logError('settings', 'Failed to remove previous profile photo', cleanupError)
        const marker = '/business-assets/'
        const path = decodeURIComponent(new URL(previousPicture).pathname.split(marker)[1] || '')
        if (path) {
          await queueUploadedFileCleanup('business-assets', path).catch((queueError) => {
            logError('settings', 'Failed to queue previous profile photo cleanup', queueError)
          })
        }
      })
      await supabase.from('app_settings').upsert({
        id: true,
        timezone,
        date_format: dateFormat,
        time_format: timeFormat,
      })
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
      showMessage('Profile saved.', 'success')
      setUploadedPhotoPath(null)
      setSaving(false)
    }} className="space-y-6">
      <div>
        <h2 className={sectionTitleClass}>Profile Settings</h2>
        <p className={sectionDescClass}>Update your personal information and preferences.</p>
      </div>

      {/* Profile Picture */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#071f52]">Profile Picture</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#071f52] text-xl font-black text-white">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              (firstName?.[0] || user.email?.[0] || '?').toUpperCase()
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-9 rounded-xl border-[#071f52]/20 text-sm font-bold text-[#071f52] hover:bg-[#071f52]/6"
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </Button>
            {profilePicture && (
              <Button
                type="button"
                onClick={handleRemovePhoto}
                variant="ghost"
                className="h-9 rounded-xl text-sm font-semibold text-[#071f52]/58 hover:bg-[#e92935]/10 hover:text-[#e92935]"
              >
                Remove
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept={UPLOAD_POLICIES.businessAssets.accept} onChange={handleUploadPhoto} className="hidden" />
          </div>
        </div>

      </div>

      {/* Personal Information */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#071f52]">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>First Name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Last Name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Email</label>
          <input value={email} readOnly className="block w-full rounded-xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/48" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Phone</label>
          <input
            value={phone}
            onChange={(e) => {
              setPhone(`+63${getPhilippineMobileDigits(e.target.value)}`)
            }}
            inputMode="numeric"
            maxLength={13}
            placeholder="+639171234567"
            className={inputClass}
          />
        </div>
      </div>

      {/* Localization */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#071f52]">Localization</h3>
        <div className="space-y-1.5">
          <label className={labelClass}>Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
            {Intl.supportedValuesOf('timeZone').map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Date Format</label>
            <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={inputClass}>
              {dateFormats.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Time Format</label>
            <select value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)} className={inputClass}>
              {timeFormats.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </form>
  )
}

export function SettingsPasswordForm({ saving, setSaving, showMessage }: Omit<SettingsFormProps, 'user'>) {
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) showMessage(showError(error), 'error')
      else { setCurrent(''); setNewPw(''); setConfirm(''); showMessage('Password updated.', 'success') }
      setSaving(false)
    }} className="space-y-4">
      <h2 className="text-lg font-black text-[#071f52]">Change Password</h2>
      {[
        { key: 'current', label: 'Current Password', value: current, set: setCurrent },
        { key: 'new', label: 'New Password', value: newPw, set: setNewPw },
        { key: 'confirm', label: 'Confirm Password', value: confirm, set: setConfirm },
      ].map((field) => (
        <div key={field.key} className="space-y-1.5">
          <label className={labelClass}>{field.label}</label>
          <input type="password" value={field.value} onChange={(e) => field.set(e.target.value)} className={inputClass} />
        </div>
      ))}
      <Button type="submit" disabled={!current || !newPw || !confirm || saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
        {saving ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  )
}

export function SettingsAdditionalForm({ saving, setSaving, showMessage }: Omit<SettingsFormProps, 'user'>) {
  const [fuelPrice, setFuelPrice] = useState('0')
  const [fuelPriceLastUpdated, setFuelPriceLastUpdated] = useState('')
  const [taxMode, setTaxMode] = useState('percentage_tax')
  const [grossSales, setGrossSales] = useState(0)

  useEffect(() => {
    supabase.from('app_settings').select('fuel_price_per_liter,fuel_price_last_updated,tax_mode').single().then(({ data }) => {
      if (data) {
        setFuelPrice(String(data.fuel_price_per_liter ?? 0))
        setFuelPriceLastUpdated(data.fuel_price_last_updated || '')
        setTaxMode(data.tax_mode || 'unregistered')
      }
    })
    const currentYear = String(new Date().getFullYear())
    supabase.from('annual_gross_sales').select('tax_year,gross_sales').then(({ data }) => {
      const current = data?.find((row) => String(row.tax_year).startsWith(currentYear))
      setGrossSales(Number(current?.gross_sales ?? 0))
    })
  }, [])

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const value = Number(fuelPrice)
      if (!Number.isFinite(value) || value < 0) {
        showMessage('Enter a valid fuel price.', 'error')
        setSaving(false)
        return
      }
      if (!['unregistered', 'percentage_tax', 'vat'].includes(taxMode)) {
        showMessage('Select a valid tax mode.', 'error')
        setSaving(false)
        return
      }
      const updatedAt = new Date().toISOString().slice(0, 10)
      const { error } = await supabase.from('app_settings').upsert({
        id: true,
        fuel_price_per_liter: value,
        fuel_price_last_updated: updatedAt,
        tax_mode: taxMode,
      })
      if (error) showMessage(showError(error), 'error')
      else {
        setFuelPriceLastUpdated(updatedAt)
        showMessage('Additional settings saved.', 'success')
      }
      setSaving(false)
    }} className="space-y-4">
      <div>
        <h2 className={sectionTitleClass}>Additional Settings</h2>
        <p className={sectionDescClass}>Manage values used by route-based quotes.</p>
      </div>
      <div className="max-w-sm space-y-1.5">
        <label className={labelClass}>Fuel Price / Liter ₱</label>
        <input className={inputClass} type="number" min="0" step="0.01" value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} />
        <p className={sectionDescClass}>Last updated: {fuelPriceLastUpdated || 'Not set'}</p>
      </div>
      <div className="max-w-sm space-y-1.5">
        <label htmlFor="tax-mode" className={labelClass}>Tax Registration</label>
        <select id="tax-mode" className={inputClass} value={taxMode} onChange={(e) => setTaxMode(e.target.value)}>
          <option value="vat">VAT — 12%</option>
          <option value="percentage_tax">Percentage Tax — 3%</option>
          <option value="unregistered">Not yet registered</option>
        </select>
        <p className={sectionDescClass}>
          {taxMode === 'vat'
            ? 'Requires BIR VAT registration and issuing VAT invoices.'
            : taxMode === 'percentage_tax'
              ? 'For gross sales of ₱3M or less per year.'
              : 'No tax is added until registration.'}
        </p>
        <p className={sectionDescClass}>
          Gross sales this year: ₱{grossSales.toLocaleString('en-PH', { maximumFractionDigits: 2 })} — Percentage Tax threshold ₱3,000,000.
        </p>
        {grossSales >= 3_000_000 && taxMode !== 'vat' && (
          <p className="text-sm font-semibold text-red-700">Threshold exceeded. Register for VAT with the BIR using Form 1905 within 10 days of the month exceeded under RR No. 11-2018.</p>
        )}
      </div>
      <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
        {saving ? 'Saving...' : 'Save Additional Settings'}
      </Button>
    </form>
  )
}

const countries = ['Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom', 'Singapore', 'Japan', 'South Korea', 'Hong Kong', 'Other']

export function SettingsBusinessForm({ saving, setSaving, showMessage }: Omit<SettingsFormProps, 'user'>) {
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [business, setBusiness] = useState({
    business_name: '', support_email: '', support_phone: '', business_address: '',
    city: '', province: '', zip_code: '', country: 'Philippines',
    facebook_link: '', instagram_link: '', logo_url: '' as string | null,
  })
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    supabase.from('app_settings').select('*').single().then(({ data }) => {
      if (data) setBusiness((prev) => ({
        ...prev,
        business_name: data.business_name || '',
        support_email: data.support_email || '',
        support_phone: data.support_phone ? normalizePhilippineMobile(data.support_phone) : '',
        business_address: data.business_address || '',
        city: data.city || '',
        province: data.province || '',
        zip_code: data.zip_code || '',
        country: data.country || 'Philippines',
        facebook_link: data.facebook_link || '',
        instagram_link: data.instagram_link || '',
        logo_url: data.logo_url || null,
      }))
    })
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `business/logo-${crypto.randomUUID()}.${ext}`
    const previousLogo = business.logo_url
    try {
      await uploadFile({ bucket: 'business-assets', file, path, policy: UPLOAD_POLICIES.businessAssets, upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      setBusiness({ ...business, logo_url: url })
      const { error: saveError } = await supabase.from('app_settings').upsert({ id: true, logo_url: url })
        if (saveError) throw saveError
        await queryClient.invalidateQueries({ queryKey: ['app-settings'] })
        if (previousLogo) await removeUploadedFileByUrlWithQueue('business-assets', previousLogo).catch((cleanupError) => {
          logError('settings', 'Failed to remove previous business logo', cleanupError)
        })
    } catch (error) {
      await removeUploadedFileWithQueue('business-assets', path).catch((cleanupError) => {
        logError('settings', 'Failed to remove business logo after save failure', cleanupError)
      })
      showMessage(showError(error as Error), 'error')
    }
    setLogoUploading(false)
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const { error } = await supabase.from('app_settings').upsert({
        id: true,
        business_name: business.business_name,
        support_email: business.support_email,
        support_phone: normalizePhilippineMobile(business.support_phone),
        business_address: business.business_address,
        city: business.city,
        province: business.province,
        zip_code: business.zip_code,
        country: business.country,
        facebook_link: business.facebook_link,
        instagram_link: business.instagram_link,
        logo_url: business.logo_url,
      })
      if (error) showMessage(showError(error), 'error')
      else {
        showMessage('Business settings saved.', 'success')
        await queryClient.invalidateQueries({ queryKey: ['app-settings'] })
        await queryClient.invalidateQueries({ queryKey: ['app-settings', 'business-info'] })
      }
      setSaving(false)
    }} className="space-y-4">
      <h2 className="text-lg font-black text-[#071f52]">Business Information</h2>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#071f52]/10 bg-[#f7f9ff]">
          {business.logo_url ? (
            <img src={business.logo_url} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-[#071f52]/38">Logo</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={logoUploading}
            onClick={() => logoInputRef.current?.click()}
            variant="outline"
            className="h-9 rounded-xl border-[#071f52]/20 text-sm font-bold text-[#071f52] hover:bg-[#071f52]/6"
          >
            {logoUploading ? 'Uploading...' : 'Change Logo'}
          </Button>
          {business.logo_url && (
            <Button
              type="button"
              onClick={() => setBusiness({ ...business, logo_url: null })}
              variant="ghost"
              className="h-9 rounded-xl text-sm font-semibold text-[#071f52]/58 hover:bg-[#e92935]/10 hover:text-[#e92935]"
            >
              Remove
            </Button>
          )}
          <input ref={logoInputRef} type="file" accept={UPLOAD_POLICIES.businessAssets.accept} onChange={handleLogoUpload} className="hidden" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Business Name <span className="text-[#e92935]">*</span></label>
        <input required value={business.business_name} onChange={(e) => setBusiness({ ...business, business_name: e.target.value })} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Email <span className="text-[#e92935]">*</span></label>
          <input required type="email" value={business.support_email} onChange={(e) => setBusiness({ ...business, support_email: e.target.value })} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Mobile Number <span className="text-[#e92935]">*</span></label>
          <input
            required
            value={business.support_phone}
            onChange={(e) => {
              setBusiness({ ...business, support_phone: `+63${getPhilippineMobileDigits(e.target.value)}` })
            }}
            inputMode="numeric"
            maxLength={13}
            placeholder="+639171234567"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Facebook Page Link</label>
          <input type="url" value={business.facebook_link} onChange={(e) => setBusiness({ ...business, facebook_link: e.target.value })} placeholder="https://facebook.com/yourbusiness" className={`${inputClass} placeholder:text-[#071f52]/38`} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Instagram Link</label>
          <input type="url" value={business.instagram_link} onChange={(e) => setBusiness({ ...business, instagram_link: e.target.value })} placeholder="https://instagram.com/yourbusiness" className={`${inputClass} placeholder:text-[#071f52]/38`} />
        </div>
      </div>
      <p className="text-xs font-medium text-[#071f52]/48">Link to your Facebook business page — used to verify your business and help customers find you. Set during registration; you can update it here anytime. Instagram link is shown to customers on your contact page; leave blank to hide the icon.</p>

      <hr className="border-[#071f52]/8" />

      <h3 className="text-sm font-bold text-[#071f52]">Address</h3>
      <div className="space-y-1.5">
        <label className={labelClass}>Street Address <span className="text-[#e92935]">*</span></label>
        <input required value={business.business_address} onChange={(e) => setBusiness({ ...business, business_address: e.target.value })} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>City <span className="text-[#e92935]">*</span></label>
          <input required value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Province / State <span className="text-[#e92935]">*</span></label>
          <input required value={business.province} onChange={(e) => setBusiness({ ...business, province: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>ZIP Code <span className="text-[#e92935]">*</span></label>
          <input required value={business.zip_code} onChange={(e) => setBusiness({ ...business, zip_code: e.target.value })} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Country <span className="text-[#e92935]">*</span></label>
          <select required value={business.country} onChange={(e) => setBusiness({ ...business, country: e.target.value })} className={inputClass}>
            {countries.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">{saving ? 'Saving...' : 'Save Settings'}</Button>
    </form>
  )
}

export function SettingsContactForm({ user, saving, setSaving, showMessage }: SettingsFormProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const { error } = await supabase.functions.invoke('send-email', {
        body: { subject: `[Admin] ${subject}`, text: `From: ${user?.email}\n\n${body}` },
      })
      if (error) showMessage(showError(error) || 'Message could not be sent.', 'error')
      else { showMessage('Message sent successfully.', 'success'); setSubject(''); setBody('') }
      setSaving(false)
    }} className="space-y-4">
      <h2 className="text-lg font-black text-[#071f52]">Contact Developer</h2>
      <p className="text-sm text-[#071f52]/58">Send a message directly to the developer. Use this for bug reports, feature requests, or urgent issues.</p>
      <div className="space-y-1.5"><label className={labelClass}>Subject</label><input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Bug report / Feature request" className={inputClass} /></div>
      <div className="space-y-1.5"><label className={labelClass}>Message</label><textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Describe the issue or request in detail…" className={`${inputClass} resize-none`} /></div>
      <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">{saving ? 'Sending...' : 'Send Message'}</Button>
    </form>
  )
}

const channelLabels: Record<PaymentChannel, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  ewallet: 'E-Wallet',
  online_gateway: 'Online Gateway',
}

const paymentChannels: PaymentChannel[] = ['cash', 'bank_transfer', 'ewallet', 'online_gateway']

const emptyPaymentMethod: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'> = {
  channel: 'bank_transfer' as PaymentChannel,
  provider: '',
  branch: '',
  account_number: '',
  account_name: '',
  account_type: 'Savings',
  currency: 'PHP',
  instructions: null,
  qr_image_path: null,
  is_active: true,
}

export function SettingsPaymentsForm({ saving, setSaving, showMessage }: Omit<SettingsFormProps, 'user'>) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [editing, setEditing] = useState<Partial<PaymentMethod> | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [qrFile, setQrFile] = useState<File | null>(null)

  const loadMethods = async () => {
    try {
      setMethods(await getAllPaymentMethods())
    } catch (error) {
      logError('settings', 'Payment methods loading failed', error, { requestId: getRequestId() })
      showMessage('Failed to load payment methods.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadMethods() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    let uploadedQrPath: string | null = null
    try {
      let qrPath = editing.qr_image_path ?? null
      const previousQrPath = qrPath

      if (qrFile) {
        const ext = qrFile.name.split('.').pop()
        const storageKey = editing.id ?? crypto.randomUUID()
        const path = `payment-qr/${storageKey}-${crypto.randomUUID()}.${ext}`
        await uploadFile({ bucket: 'business-assets', file: qrFile, path, policy: UPLOAD_POLICIES.businessAssets, upsert: true })
        uploadedQrPath = path
        const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(path)
        qrPath = `${publicUrl}?t=${Date.now()}`
      }

      const payload = {
        ...editing,
        qr_image_path: qrPath,
      }

      if (editing.id) {
        const { id, created_at, updated_at, ...rest } = payload
        await updatePaymentMethod(id!, rest)
      } else {
        const { id, created_at, updated_at, ...rest } = payload as PaymentMethod
        await createPaymentMethod(rest)
      }
      if (previousQrPath && uploadedQrPath) await removeUploadedFileByUrlWithQueue('business-assets', previousQrPath).catch((cleanupError) => {
        logError('settings', 'Failed to remove previous payment QR code', cleanupError)
      })
      showMessage('Payment method saved.', 'success')
      setEditing(null)
      setShowForm(false)
      setQrFile(null)
      loadMethods()
    } catch (err) {
      if (uploadedQrPath) await removeUploadedFileWithQueue('business-assets', uploadedQrPath).catch((cleanupError) => {
        logError('settings', 'Failed to remove payment QR code after save failure', cleanupError)
      })
      showMessage(showError(err instanceof Error ? err : new Error('Save failed')), 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment method?')) return
    try {
      await deletePaymentMethod(id)
      showMessage('Payment method deleted.', 'success')
      loadMethods()
    } catch (err) {
      showMessage(showError(err instanceof Error ? err : new Error('Delete failed')), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-black text-[#071f52]">Payments</h2>
        </div>
        <Button type="button" onClick={() => { setEditing({ ...emptyPaymentMethod }); setQrFile(null); setShowForm(true) }} className="bg-[#071f52] text-white hover:bg-[#112458]">
          + Add Method
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : (
        <div className="card-overflow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BANK / PROVIDER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BRANCH</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACCOUNT NUMBER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACCOUNT NAME</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TYPE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {methods.map((m) => (
                <tr key={m.id} className="hover:bg-[#f7f9ff] transition-colors">
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#071f52]">{m.provider}</p>
                      <p className="text-xs text-[#071f52]/48">{m.currency}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-[#071f52]/64">{m.branch || '-'}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-mono text-[#071f52]">{m.account_number || '-'}</p>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-[#071f52]">{m.account_name || '-'}</td>
                  <td className="px-5 py-3 text-sm text-[#071f52]/64">{m.account_type || '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${m.is_active ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#e92935]/10 text-[#c91f2a]'}`}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditing(m); setQrFile(null); setShowForm(true) }}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-[#071f52]/58 hover:bg-[#071f52]/8 hover:text-[#071f52]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-[#e92935]/58 hover:bg-[#e92935]/10 hover:text-[#e92935]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {methods.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm font-medium text-[#071f52]/48">No payment methods yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setEditing(null); setQrFile(null); setShowForm(false) }}>
          <form onSubmit={handleSave} className="rounded-xl border border-[#071f52]/10 bg-white p-6 space-y-3 shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[#071f52]">{editing.id ? 'Edit Payment Method' : 'Add Payment Method'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>Payment Channel</label>
                <select
                  value={editing.channel || 'bank_transfer'}
                  onChange={(e) => setEditing({ ...editing, channel: e.target.value as PaymentChannel })}
                  className={inputClass}
                >
                  {paymentChannels.map((c) => <option key={c} value={c}>{channelLabels[c]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Bank / Provider</label>
                <input required={editing.channel !== 'cash'} value={editing.provider || ''} onChange={(e) => setEditing({ ...editing, provider: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Branch</label>
                <input value={editing.branch || ''} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Currency</label>
                <input required value={editing.currency || 'PHP'} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Account Number</label>
                <input required={editing.channel !== 'cash'} value={editing.account_number || ''} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Account Name</label>
                <input required value={editing.account_name || ''} onChange={(e) => setEditing({ ...editing, account_name: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Account Type</label>
                <input value={editing.account_type || 'Savings'} onChange={(e) => setEditing({ ...editing, account_type: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass}>Payment Instructions</label>
                <textarea value={editing.instructions || ''} onChange={(e) => setEditing({ ...editing, instructions: e.target.value || null })} rows={3} placeholder="e.g. Send payment to the account above and upload your receipt." className={inputClass} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass}>QR Code Image</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white hover:bg-[#112458]">
                    {qrFile ? 'Change File' : editing.qr_image_path ? 'Replace QR' : 'Upload QR'}
                    <input type="file" accept={UPLOAD_POLICIES.businessAssets.accept} onChange={(e) => setQrFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  {qrFile ? (
                    <span className="text-xs font-semibold text-[#071f52]">{qrFile.name}</span>
                  ) : editing.qr_image_path ? (
                    <img src={editing.qr_image_path} alt="QR Code" className="h-16 w-16 rounded-lg border border-[#071f52]/10 object-contain" />
                  ) : null}
                  {(qrFile || editing.qr_image_path) && (
                    <button type="button" onClick={() => { setQrFile(null); setEditing({ ...editing, qr_image_path: null }) }} className="text-xs font-bold text-[#e92935] hover:underline">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-[#071f52]">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-[#071f52]/20 text-[#071f52] accent-[#071f52]"
              />
              Active
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">{saving ? 'Saving...' : 'Save'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); setQrFile(null); setShowForm(false) }} className="text-[#071f52]/58">Cancel</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export function SettingsServiceAreaForm({ saving, setSaving, showMessage }: Omit<SettingsFormProps, 'user'>) {
  const { data: areas = [], isLoading } = useServiceAreas()
  const createMutation = useCreateServiceArea()
  const updateMutation = useUpdateServiceArea()
  const deleteMutation = useDeleteServiceArea()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Partial<ServiceArea> | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)

  const selectedArea = areas.find((a) => a.id === selectedAreaId) ?? null
  const mapArea = selectedArea ?? areas[0] ?? null

  const handleAddressInput = (value: string) => {
    setAddressInput(value)
    setEditing((prev) => prev ? { ...prev, label: value, address: value } : null)
    setSuggestions([])

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = value.trim()
    if (trimmed.length < 3) { setDebouncedQuery(''); setAddressLoading(false); return }

    debounceRef.current = window.setTimeout(() => setDebouncedQuery(trimmed), 300)
  }

  useEffect(() => {
    if (!debouncedQuery) return
    let cancelled = false
    setAddressLoading(true)
    suggestLocations(debouncedQuery).then((results) => {
      if (!cancelled) setSuggestions(results)
    }).catch(() => {
      if (!cancelled) setSuggestions([])
    }).finally(() => {
      if (!cancelled) setAddressLoading(false)
    })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setAddressInput(suggestion.label)
    setSuggestions([])
    setEditing((prev) => prev ? {
      ...prev,
      label: suggestion.label,
      address: suggestion.label,
      lat: suggestion.lat,
      lng: suggestion.lng,
    } : null)
  }

  const openAdd = () => {
    setEditing({ label: '', address: '', lat: null, lng: null, radius_km: 5, is_active: true })
    setAddressInput('')
    setSuggestions([])
    setShowForm(true)
  }

  const openEdit = (area: ServiceArea) => {
    setEditing({ ...area })
    setAddressInput(area.address)
    setSuggestions([])
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      if (editing.id) {
        await updateMutation.mutateAsync({
          id: editing.id,
          label: editing.label,
          address: editing.address,
          lat: editing.lat ?? null,
          lng: editing.lng ?? null,
          radius_km: editing.radius_km ?? 5,
          is_active: editing.is_active,
        })
        showMessage('Service area updated.', 'success')
      } else {
        await createMutation.mutateAsync({
          label: editing.label || editing.address || '',
          address: editing.address || '',
          lat: editing.lat ?? null,
          lng: editing.lng ?? null,
          radius_km: editing.radius_km ?? 5,
        })
        showMessage('Service area added.', 'success')
      }
      setEditing(null)
      setShowForm(false)
      setAddressInput('')
      setSuggestions([])
    } catch (err) {
      showMessage(showError(err instanceof Error ? err : new Error('Save failed')), 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service area?')) return
    try {
      await deleteMutation.mutateAsync(id)
      showMessage('Service area deleted.', 'success')
    } catch (err) {
      showMessage(showError(err instanceof Error ? err : new Error('Delete failed')), 'error')
    }
  }

  const handleToggleActive = async (area: ServiceArea) => {
    try {
      await updateMutation.mutateAsync({ id: area.id, is_active: !area.is_active })
    } catch (err) {
      showMessage(showError(err instanceof Error ? err : new Error('Toggle failed')), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className={sectionTitleClass}>Service Area</h2>
          <p className={sectionDescClass}>
            Add the locations you serve from — each with its own radius. A pickup is auto-priced by distance when it falls within range of any location below; pickups outside every area are flagged for manual pricing. Remove all locations to serve anywhere.
          </p>
        </div>
        <Button type="button" onClick={openAdd} className="bg-[#071f52] text-white hover:bg-[#112458]">
          + Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : (
        <>
          {areas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#071f52]/14 bg-[#f7f9ff] px-4 py-12 text-center">
              <p className="text-sm font-semibold text-[#071f52]/48">No service areas configured — serving anywhere.</p>
              <p className="mt-1 text-xs font-medium text-[#071f52]/38">Add your first location above or leave empty to accept pickups from everywhere.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-[#071f52]/6 rounded-xl border border-[#071f52]/10">
                {areas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedAreaId(selectedAreaId === area.id ? null : area.id)}
                    className={`flex w-full items-center justify-between px-5 py-3 text-left transition-colors ${
                      selectedAreaId === area.id ? 'bg-[#071f52]/4' : 'hover:bg-[#f7f9ff]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-[#071f52]/42" />
                        <p className="truncate text-sm font-semibold text-[#071f52]">{area.label}</p>
                      </div>
                      <p className="mt-0.5 pl-6 text-xs font-medium text-[#071f52]/48">
                        {area.address} — {area.radius_km}km radius
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(area)}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                          area.is_active ? 'bg-[#16a34a]/10 text-[#16a34a] hover:bg-[#16a34a]/20' : 'bg-[#e92935]/10 text-[#c91f2a] hover:bg-[#e92935]/20'
                        }`}
                      >
                        {area.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(area)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-[#071f52]/58 hover:bg-[#071f52]/8 hover:text-[#071f52]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(area.id)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-[#e92935]/58 hover:bg-[#e92935]/10 hover:text-[#e92935]"
                      >
                        Delete
                      </button>
                    </div>
                  </button>
                ))}
              </div>

              {mapArea.lat != null && mapArea.lng != null && (
                <div>
                  <ServiceAreaMap lat={mapArea.lat} lng={mapArea.lng} radiusKm={mapArea.radius_km} />
                  <p className="mt-2 text-center text-xs font-semibold text-[#071f52]/48">
                    {selectedArea ? selectedArea.label : 'First location'} — {mapArea.radius_km}km coverage
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showForm && editing && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-[#071f52]/55 p-4 backdrop-blur-[2px]"
          onClick={() => { setEditing(null); setShowForm(false); setAddressInput(''); setSuggestions([]) }}
        >
          <form
            onSubmit={handleSave}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-area-dialog-title"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-[#071f52]/10 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="service-area-dialog-title" className="text-sm font-bold text-[#071f52]">{editing.id ? 'Edit Service Area' : 'Add Service Area'}</h3>

            <div className="space-y-1.5 relative">
              <label className={labelClass}>Address</label>
              <input
                value={addressInput}
                onChange={(e) => handleAddressInput(e.target.value)}
                placeholder="Type a location name or address…"
                autoComplete="off"
                className={inputClass}
              />
              {(addressInput.trim().length < 3 && addressInput.trim().length > 0) && (
                <p className="text-xs font-medium text-[#071f52]/48 ml-1">Keep typing...</p>
              )}
              {addressLoading && <p className="text-xs font-medium text-[#071f52]/48 ml-1">Looking up locations...</p>}
              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[#071f52]/10 bg-white shadow-[0_18px_44px_rgba(7,31,82,0.12)]">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="flex w-full items-start gap-3 border-t border-[#071f52]/6 px-4 py-3 text-left first:border-t-0 hover:bg-[#f7f9ff]"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#071f52]/42" />
                      <span className="text-sm font-semibold text-[#071f52]">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {editing.lat != null && editing.lng != null && (
              <ServiceAreaMap lat={editing.lat} lng={editing.lng} radiusKm={editing.radius_km ?? 5} />
            )}

            <div className="space-y-1.5">
              <label className={labelClass}>Radius (km)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={editing.radius_km ?? 5}
                onChange={(e) => setEditing({ ...editing, radius_km: Number(e.target.value) || 0 })}
                className={inputClass}
              />
              <p className="text-xs font-medium text-[#071f52]/38">Pickups within this distance from the location are auto-priced.</p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !editing.address?.trim()} className="bg-[#071f52] text-white hover:bg-[#112458]">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); setShowForm(false); setAddressInput(''); setSuggestions([]) }} className="text-[#071f52]/58">Cancel</Button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  )
}
