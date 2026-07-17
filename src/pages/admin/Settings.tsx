import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const tabs = [
  'Profile', 'Password', 'Business',
  'Team', 'Payments', 'Documents', 'Integrations',
  'Pickup', 'Email Log', 'Content', 'Domain', 'Email', 'Help',
  'Contact Developer',
]

const countries = ['Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom', 'Singapore', 'Japan', 'South Korea', 'Hong Kong', 'Other']

export default function AdminSettings({ tab: initialTab }: { tab?: string }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab || 'Profile')
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', mobile: '+63 ' })
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [business, setBusiness] = useState({ business_name: '', support_email: '', support_phone: '', business_address: '', city: '', province: '', zip_code: '', country: 'Philippines', tin_number: '', vat_percent: '0' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [loading, setLoading] = useState(true)
  const [contactSubject, setContactSubject] = useState('')
  const [contactBody, setContactBody] = useState('')

  const handleContactDeveloper = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        subject: `[Admin] ${contactSubject}`,
        text: `From: ${user?.email}\n\n${contactBody}`,
      },
    })
    if (error) {
      showMessage(error.message || 'Failed to send message.', 'error')
    } else {
      showMessage('Message sent to developer.', 'success')
      setContactSubject('')
      setContactBody('')
    }
    setSaving(false)
  }

  useEffect(() => {
    setActiveTab(initialTab || 'Profile')
  }, [initialTab])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('app_settings').select('*').limit(1).single(),
    ]).then(([pRes, sRes]) => {
      if (!pRes.error && pRes.data) {
        const p = pRes.data as any
        setProfile({
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email || user.email || '',
          mobile: p.mobile || '+63 ',
        })
      }
      if (!sRes.error && sRes.data) {
        const s = sRes.data as any
        setBusiness({
          business_name: s.business_name || '',
          support_email: s.support_email || '',
          support_phone: s.support_phone || '',
          business_address: s.business_address || '',
          city: s.city || '',
          province: s.province || '',
          zip_code: s.zip_code || '',
          country: s.country || 'Philippines',
          tin_number: s.tin_number || '',
          vat_percent: String(s.vat_percent || 0),
        })
      }
      setLoading(false)
    })
  }, [user])

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg)
    setMessageType(type)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      mobile: profile.mobile,
    }).eq('id', user.id)
    if (error) showMessage(friendlyError(error), 'error')
    else showMessage('Profile saved.', 'success')
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: password.new })
    if (error) showMessage(friendlyError(error), 'error')
    else { setPassword({ current: '', new: '', confirm: '' }); showMessage('Password updated.', 'success') }
    setSaving(false)
  }

  const handleSaveBusiness = async (e: React.FormEvent) => {
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
    if (error) showMessage(friendlyError(error), 'error')
    else showMessage('Business settings saved.', 'success')
    setSaving(false)
  }

  const inputClass = 'block w-full rounded-xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
  const labelClass = 'text-xs font-bold text-[#071f52]'

  return (
    <div className="p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Settings</h1>

      {message && (
        <div className={cn(
          'mt-4 rounded-xl border px-4 py-2.5 text-sm font-bold',
          messageType === 'success' ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]' : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]',
        )}>{message}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={cn(
                'block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-colors',
                activeTab === t
                  ? 'bg-[#071f52] text-white'
                  : 'text-[#071f52]/64 hover:bg-[#071f52]/8 hover:text-[#071f52]',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-[#071f52]/6" />)}
            </div>
          ) : (
            <>
              {activeTab === 'Profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <h2 className="text-lg font-black text-[#071f52]">Admin Profile</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={labelClass}>First Name</label>
                      <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Last Name</label>
                      <input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email</label>
                    <input value={profile.email} readOnly className="block w-full rounded-xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/48" />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Mobile</label>
                    <input value={profile.mobile} onChange={(e) => {
                      const val = e.target.value
                      setProfile({ ...profile, mobile: val.startsWith('+63 ') ? val : '+63 ' })
                    }} className={inputClass} />
                  </div>
                  <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </form>
              )}

              {activeTab === 'Password' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h2 className="text-lg font-black text-[#071f52]">Change Password</h2>
                  {(['current', 'new', 'confirm'] as const).map((field) => (
                    <div key={field} className="space-y-1.5">
                      <label className={labelClass}>{field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm Password'}</label>
                      <input type="password" value={password[field]} onChange={(e) => setPassword({ ...password, [field]: e.target.value })}
                        className={inputClass} />
                    </div>
                  ))}
                  <Button type="submit" disabled={!password.current || !password.new || !password.confirm || saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              )}

              {activeTab === 'Business' && (
                <form onSubmit={handleSaveBusiness} className="space-y-4">
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
                    <div className="space-y-1.5">
                      <label className={labelClass}>City</label>
                      <input value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Province</label>
                      <input value={business.province} onChange={(e) => setBusiness({ ...business, province: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>ZIP Code</label>
                      <input value={business.zip_code} onChange={(e) => setBusiness({ ...business, zip_code: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Country</label>
                      <select value={business.country} onChange={(e) => setBusiness({ ...business, country: e.target.value })} className={inputClass}>
                        {countries.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>TIN Number</label>
                      <input value={business.tin_number} onChange={(e) => setBusiness({ ...business, tin_number: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>VAT %</label>
                    <input type="number" value={business.vat_percent} onChange={(e) => setBusiness({ ...business, vat_percent: e.target.value })} className={inputClass} />
                  </div>
                  <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              )}

              {activeTab === 'Contact Developer' && (
                <form onSubmit={handleContactDeveloper} className="space-y-4">
                  <h2 className="text-lg font-black text-[#071f52]">Contact Developer</h2>
                  <p className="text-sm text-[#071f52]/58">Send a message directly to the developer. Use this for bug reports, feature requests, or urgent issues.</p>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Subject</label>
                    <input required value={contactSubject} onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="Bug report / Feature request"
                      className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Message</label>
                    <textarea required value={contactBody} onChange={(e) => setContactBody(e.target.value)}
                      rows={5} placeholder="Describe the issue or request in detail…"
                      className={inputClass + ' resize-none'} />
                  </div>
                  <Button type="submit" disabled={saving} className="bg-[#071f52] text-white hover:bg-[#112458]">
                    {saving ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              )}

              {!['Profile', 'Password', 'Business', 'Contact Developer'].includes(activeTab) && (
                <div className="text-center py-12">
                  <p className="text-sm font-semibold text-[#071f52]/48">{activeTab} settings coming soon.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
