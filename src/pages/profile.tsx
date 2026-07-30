import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Camera, Phone, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isValidPassword } from '@/lib/validation'
import { AUTH_MESSAGES } from '@/constants/auth'
import { composeProfileAddress, parseProfileAddress } from '@/lib/profile-address'

const countries = [
  'Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom',
  'Singapore', 'Japan', 'South Korea', 'Hong Kong', 'Other',
]

const emptyProfile = {
  first_name: '',
  last_name: '',
  email: '',
  mobile: '+63 ',
  address_line_1: '',
  address_line_2: '',
  street_address: '',
  barangay: '',
  address: '',
  city: '',
  province: '',
  zip_code: '',
  country: 'Philippines',
  profile_image_path: null as string | null,
}

function isMissingRequiredValue(value: string, field: 'default' | 'mobile' = 'default') {
  const trimmedValue = value.trim()

  if (trimmedValue === '') return true

  return field === 'mobile' && trimmedValue === '+63'
}

export default function Profile() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState(emptyProfile)
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [messageScope, setMessageScope] = useState<'profile' | 'password'>('profile')
  const [uploading, setUploading] = useState(false)
  const [showProfileValidation, setShowProfileValidation] = useState(false)

  const { data: profileData, isLoading } = useProfile(user?.id)
  const updateProfile = useUpdateProfile()

  const getProfileFieldClassName = (invalid: boolean) => cn(
    'block w-full rounded-2xl border bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:bg-white focus:outline-none focus:ring-2',
    invalid
      ? 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30'
      : 'border-[#071f52]/14 focus:border-[#071f52] focus:ring-[#ffd923]/60',
  )

  const invalidProfileFields = {
    mobile: showProfileValidation && isMissingRequiredValue(profile.mobile, 'mobile'),
    address_line_1: showProfileValidation && isMissingRequiredValue(profile.address_line_1),
    street_address: showProfileValidation && isMissingRequiredValue(profile.street_address),
    barangay: showProfileValidation && isMissingRequiredValue(profile.barangay),
    city: showProfileValidation && isMissingRequiredValue(profile.city),
    province: showProfileValidation && isMissingRequiredValue(profile.province),
    zip_code: showProfileValidation && isMissingRequiredValue(profile.zip_code),
    country: showProfileValidation && isMissingRequiredValue(profile.country),
  }

  useEffect(() => {
    if (profileData) {
      const parsedAddress = parseProfileAddress(profileData.address)

      setProfile({
        first_name: profileData.first_name || user?.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: profileData.last_name || user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: profileData.email || user?.email || '',
        mobile: profileData.mobile || '+63 ',
        address_line_1: profileData.address_line_1 || parsedAddress.address_line_1,
        address_line_2: profileData.address_line_2 || parsedAddress.address_line_2,
        street_address: profileData.street_address || parsedAddress.street_address,
        barangay: profileData.barangay || parsedAddress.barangay,
        address: profileData.address || '',
        city: profileData.city || '',
        province: profileData.province || '',
        zip_code: profileData.zip_code || '',
        country: profileData.country || 'Philippines',
        profile_image_path: profileData.profile_image_path || null,
      })
    }
  }, [profileData, user])

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `profile-photos/${user.id}.${ext}`

    const { error } = await supabase.storage
      .from('business-assets')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(path)
      setProfile({ ...profile, profile_image_path: publicUrl })
    }
    setUploading(false)
  }

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return
    setMessage('')
    setShowProfileValidation(true)

    if (mobileInputRef.current) {
      mobileInputRef.current.setCustomValidity(profile.mobile === '+63 ' ? 'Please fill out this field.' : '')
    }

    if (!e.currentTarget.reportValidity()) {
      setMessage('Please fill out the required fields.')
      setMessageType('error')
      setMessageScope('profile')
      return
    }

    const address = composeProfileAddress(profile)

    setSaving(true)

    updateProfile.mutate(
      {
        id: user.id,
        data: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          mobile: profile.mobile,
          address_line_1: profile.address_line_1,
          address_line_2: profile.address_line_2,
          street_address: profile.street_address,
          barangay: profile.barangay,
          address,
          city: profile.city,
          province: profile.province,
          zip_code: profile.zip_code,
          country: profile.country,
          profile_image_path: profile.profile_image_path,
        },
      },
      {
        onSuccess: () => {
          setMessage('Profile saved.')
          setMessageType('success')
          setMessageScope('profile')
          setShowProfileValidation(false)
          setSaving(false)
        },
        onError: (err) => {
          setMessage(err instanceof Error ? err.message : 'Profile update failed.')
          setMessageType('error')
          setMessageScope('profile')
          setSaving(false)
        },
      },
    )
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setMessage('')

    if (!isValidPassword(password.new)) {
      setMessage(AUTH_MESSAGES.errors.weak_password)
      setMessageType('error')
      setMessageScope('password')
      setPasswordSaving(false)
      return
    }

    if (password.new !== password.confirm) {
      setMessage('Passwords do not match.')
      setMessageType('error')
      setMessageScope('password')
      setPasswordSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: password.new })

    if (error) {
      setMessage(showError(error))
      setMessageType('error')
      setMessageScope('password')
    } else {
      setPassword({ current: '', new: '', confirm: '' })
      setMessage('Password updated.')
      setMessageType('success')
      setMessageScope('password')
    }
    setPasswordSaving(false)
  }

  const name = profile.first_name || profile.last_name
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : user?.email || 'Customer'

  if (isLoading) return <ProfileSkeleton />

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">My Profile</h1>
      <p className="mt-1 text-sm font-medium text-[#071f52]/58">Manage your personal information and password.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#071f52] text-2xl font-black text-white">
              {profile.profile_image_path ? (
                <img src={profile.profile_image_path} alt={name} className="h-full w-full object-cover" />
              ) : (
                (profile.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()
              )}
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload profile photo"
                className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffd923] text-[#071f52] shadow-sm"
              >
                <Camera size={12} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
            </div>
            <div>
              <p className="text-base font-bold text-[#071f52]">{name}</p>
              <p className="text-sm font-medium text-[#071f52]/48">{profile.email || user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <p className="px-1 py-1 text-sm font-black text-[#b91c1c]">
              Fields with (*) are required to make a booking.
            </p>

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
                value={profile.email || user?.email || ''}
                readOnly
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/48"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Mobile <span className="text-[#e92935]">*</span></label>
              <div className="relative">
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
                <input
                  ref={mobileInputRef}
                  value={profile.mobile}
                  onChange={(e) => {
                    const val = e.target.value
                    e.target.setCustomValidity('')
                    setProfile({ ...profile, mobile: val.startsWith('+63 ') ? val : '+63 ' })
                  }}
                  aria-invalid={invalidProfileFields.mobile}
                  required
                  placeholder="+63 917 XXX XXXX"
                  className={cn(
                    getProfileFieldClassName(invalidProfileFields.mobile),
                    'py-2.5 pl-9 pr-4 placeholder:text-[#071f52]/38',
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Address Line 1 <span className="text-[#e92935]">*</span></label>
              <input
                value={profile.address_line_1}
                onChange={(e) => setProfile({ ...profile, address_line_1: e.target.value })}
                aria-invalid={invalidProfileFields.address_line_1}
                required
                placeholder="Unit / House No. / Building"
                className={cn(getProfileFieldClassName(invalidProfileFields.address_line_1), 'placeholder:text-[#071f52]/38')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Address Line 2</label>
              <input
                value={profile.address_line_2}
                onChange={(e) => setProfile({ ...profile, address_line_2: e.target.value })}
                placeholder="Subdivision / Building Wing / Landmark"
                className={cn(getProfileFieldClassName(false), 'placeholder:text-[#071f52]/38')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Street Address <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.street_address}
                  onChange={(e) => setProfile({ ...profile, street_address: e.target.value })}
                  aria-invalid={invalidProfileFields.street_address}
                  required
                  placeholder="Street name"
                  className={cn(getProfileFieldClassName(invalidProfileFields.street_address), 'placeholder:text-[#071f52]/38')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Barangay <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.barangay}
                  onChange={(e) => setProfile({ ...profile, barangay: e.target.value })}
                  aria-invalid={invalidProfileFields.barangay}
                  required
                  placeholder="Barangay"
                  className={cn(getProfileFieldClassName(invalidProfileFields.barangay), 'placeholder:text-[#071f52]/38')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">City <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  aria-invalid={invalidProfileFields.city}
                  required
                  placeholder="Pasay City"
                  className={getProfileFieldClassName(invalidProfileFields.city)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Province <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  aria-invalid={invalidProfileFields.province}
                  required
                  placeholder="Metro Manila"
                  className={getProfileFieldClassName(invalidProfileFields.province)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">ZIP Code <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.zip_code}
                  onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })}
                  aria-invalid={invalidProfileFields.zip_code}
                  required
                  placeholder="1309"
                  className={getProfileFieldClassName(invalidProfileFields.zip_code)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
                <select
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  aria-invalid={invalidProfileFields.country}
                  required
                  className={getProfileFieldClassName(invalidProfileFields.country)}
                >
                  {countries.map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={saving} size="lg" className="w-full bg-[#071f52] text-white hover:bg-[#112458]">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>

            {message && messageScope === 'profile' ? (
              <div className={cn(
                'rounded-2xl border px-4 py-3 text-sm font-bold',
                messageType === 'success'
                  ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]'
                  : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]',
              )}>
                {message}
              </div>
            ) : null}
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
                      : field === 'new' ? 'Min. 6 characters'
                      : 'Re-enter new password'
                    }
                    className={cn(
                      'block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 pr-10 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:border-[#071f52] focus:ring-[#ffd923]/60',
                      field !== 'current' && password[field] &&
                        (field === 'confirm'
                          ? password[field] === password.new
                            ? 'border-[#16a34a] focus:border-[#16a34a] focus:ring-[#16a34a]/30'
                            : 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30'
                          : isValidPassword(password[field])
                            ? 'border-[#16a34a] focus:border-[#16a34a] focus:ring-[#16a34a]/30'
                            : 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30'),
                    )}
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
              disabled={!password.current || !password.new || !password.confirm || passwordSaving}
              size="lg"
              className="w-full bg-[#071f52] text-white hover:bg-[#112458]"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </Button>

            {message && messageScope === 'password' ? (
              <div className={cn(
                'rounded-2xl border px-4 py-3 text-sm font-bold',
                messageType === 'success'
                  ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]'
                  : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]',
              )}>
                {message}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
      <div className="mb-2 h-8 w-40 rounded-xl bg-[#071f52]/10" />
      <div className="mb-6 h-4 w-72 rounded-xl bg-[#071f52]/8" />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#071f52]/10" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-lg bg-[#071f52]/10" />
              <div className="h-3 w-48 rounded-lg bg-[#071f52]/8" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-14 rounded-2xl bg-[#071f52]/6" />
              <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            </div>
            <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-14 rounded-2xl bg-[#071f52]/6" />
              <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            </div>
            <div className="h-12 rounded-2xl bg-[#071f52]/10" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
          <div className="mb-2 h-5 w-36 rounded-lg bg-[#071f52]/10" />
          <div className="mb-5 h-3 w-64 rounded-lg bg-[#071f52]/8" />
          <div className="space-y-4">
            <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            <div className="h-14 rounded-2xl bg-[#071f52]/6" />
            <div className="h-12 rounded-2xl bg-[#071f52]/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
