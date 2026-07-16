import { useState } from 'react'
import { useAuth } from '@/contexts/useAuth'
import { Button } from '@/components/ui/button'
import { Camera, Phone, Eye, EyeOff } from 'lucide-react'

const countries = [
  'Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom',
  'Singapore', 'Japan', 'South Korea', 'Hong Kong', 'Other',
]

export default function Profile() {
  const { user } = useAuth()

  const [profile, setProfile] = useState({
    first_name: user?.user_metadata?.full_name?.split(' ')[0] || '',
    last_name: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    mobile: '+63 ',
    address: '',
    city: '',
    province: '',
    zip: '',
    country: 'Philippines',
  })
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    // ponytail: save to Supabase customer profile
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    // ponytail: update Supabase auth password
    await new Promise((r) => setTimeout(r, 800))
    setPassword({ current: '', new: '', confirm: '' })
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">My Profile</h1>
      <p className="mt-1 text-sm font-medium text-[#071f52]/58">Manage your personal information and password.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#071f52] text-2xl font-black text-white">
              {(profile.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
              <button type="button" className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffd923] text-[#071f52] shadow-sm">
                <Camera size={12} />
              </button>
            </div>
            <div>
              <p className="text-base font-bold text-[#071f52]">
                {profile.first_name || profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`.trim()
                  : user?.email || 'Customer'}
              </p>
              <p className="text-sm font-medium text-[#071f52]/48">{profile.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">First Name</label>
                <input
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Last Name</label>
                <input
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Email</label>
              <input
                value={profile.email}
                readOnly
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/48"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Mobile <span className="text-[#e92935]">*</span></label>
              <div className="relative">
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
                <input
                  value={profile.mobile}
                  onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                  placeholder="+63 917 XXX XXXX"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] py-2.5 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Address <span className="text-[#e92935]">*</span></label>
              <input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="House / Street / Barangay"
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">City <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="Pasay City"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Province <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  placeholder="Metro Manila"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">ZIP Code <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.zip}
                  onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
                  placeholder="1309"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
                <select
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                >
                  {countries.map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={saving} size="lg" className="w-full bg-[#071f52] text-white hover:bg-[#112458]">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#071f52]">Change Password</h2>
          <p className="mt-1 text-sm font-medium text-[#071f52]/58">Update your password to keep your account secure.</p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            {(['current', 'new', 'confirm'] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">
                  {field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <input
                    type={show[field] ? 'text' : 'password'}
                    value={password[field]}
                    onChange={(e) => setPassword({ ...password, [field]: e.target.value })}
                    placeholder={
                      field === 'current' ? 'Enter current password'
                      : field === 'new' ? 'Min. 8 characters'
                      : 'Re-enter new password'
                    }
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 pr-10 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, [field]: !show[field] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#071f52]/38 hover:text-[#071f52]"
                  >
                    {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}

            <Button
              type="submit"
              disabled={!password.current || !password.new || !password.confirm}
              size="lg"
              className="w-full bg-[#071f52] text-white hover:bg-[#112458]"
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
