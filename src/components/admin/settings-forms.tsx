import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'

const inputClass = 'block w-full rounded-xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
const labelClass = 'text-xs font-bold text-[#071f52]'

interface SettingsFormProps {
  user: NonNullable<ReturnType<typeof import('@/contexts/useAuth').useAuth>['user']>
  saving: boolean
  setSaving: (v: boolean) => void
  showMessage: (msg: string, type: 'success' | 'error') => void
}

export function SettingsProfileForm({ user, saving, setSaving, showMessage }: SettingsFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email] = useState(user.email || '')
  const [mobile, setMobile] = useState('+63 ')

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const { error } = await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        mobile,
      }).eq('id', user.id)
      if (error) showMessage(showError(error), 'error')
      else showMessage('Profile saved.', 'success')
      setSaving(false)
    }} className="space-y-4">
      <h2 className="text-lg font-black text-[#071f52]">Admin Profile</h2>
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
        <label className={labelClass}>Mobile</label>
        <input value={mobile} onChange={(e) => {
          const val = e.target.value
          setMobile(val.startsWith('+63 ') ? val : '+63 ')
        }} className={inputClass} />
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

const countries = ['Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom', 'Singapore', 'Japan', 'South Korea', 'Hong Kong', 'Other']

export function SettingsBusinessForm({ saving, setSaving, showMessage }: Omit<SettingsFormProps, 'user'>) {
  const [business, setBusiness] = useState({ business_name: '', support_email: '', support_phone: '', business_address: '', city: '', province: '', zip_code: '', country: 'Philippines', tin_number: '', vat_percent: '0' })

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      const { error } = await supabase.from('app_settings').upsert({
        id: true,
        business_name: business.business_name,
        support_email: business.support_email,
        support_phone: business.support_phone,
        business_address: business.business_address,
        city: business.city,
        province: business.province,
        zip_code: business.zip_code,
        country: business.country,
        tin_number: business.tin_number,
        vat_percent: parseFloat(business.vat_percent) || 0,
      })
      if (error) showMessage(showError(error), 'error')
      else showMessage('Business settings saved.', 'success')
      setSaving(false)
    }} className="space-y-4">
      <h2 className="text-lg font-black text-[#071f52]">Business Information</h2>
      <div className="space-y-1.5">
        <label className={labelClass}>Business Name</label>
        <input value={business.business_name} onChange={(e) => setBusiness({ ...business, business_name: e.target.value })} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Support Email</label>
          <input value={business.support_email} onChange={(e) => setBusiness({ ...business, support_email: e.target.value })} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Support Phone</label>
          <input value={business.support_phone} onChange={(e) => setBusiness({ ...business, support_phone: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Address</label>
        <input value={business.business_address} onChange={(e) => setBusiness({ ...business, business_address: e.target.value })} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5"><label className={labelClass}>City</label><input value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} className={inputClass} /></div>
        <div className="space-y-1.5"><label className={labelClass}>Province</label><input value={business.province} onChange={(e) => setBusiness({ ...business, province: e.target.value })} className={inputClass} /></div>
        <div className="space-y-1.5"><label className={labelClass}>ZIP Code</label><input value={business.zip_code} onChange={(e) => setBusiness({ ...business, zip_code: e.target.value })} className={inputClass} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Country</label>
          <select value={business.country} onChange={(e) => setBusiness({ ...business, country: e.target.value })} className={inputClass}>
            {countries.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><label className={labelClass}>TIN Number</label><input value={business.tin_number} onChange={(e) => setBusiness({ ...business, tin_number: e.target.value })} className={inputClass} /></div>
      </div>
      <div className="space-y-1.5"><label className={labelClass}>VAT %</label><input type="number" value={business.vat_percent} onChange={(e) => setBusiness({ ...business, vat_percent: e.target.value })} className={inputClass} /></div>
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
