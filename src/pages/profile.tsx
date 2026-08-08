import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { getAcceptedMimeTypes } from '@/lib/file-upload'
import { UPLOAD_POLICIES } from '@/config/constants'
import { uploadFile } from '@/services/upload-service'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/ui/country-select'
import { Camera, Phone, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhilippineMobileDigits, isValidPassword, normalizePhilippineMobile } from '@/lib/validation'
import { AUTH_MESSAGES } from '@/constants/auth'
import { composeProfileAddress, parseProfileAddress } from '@/lib/profile-address'

const emptyProfile = {
  first_name: '',
  last_name: '',
  email: '',
  mobile: '+63',
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

const MOBILE_PREFIX = '+63'

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
    'block w-full rounded-lg border bg-[#f7f9ff] px-3 py-2 text-xs font-semibold text-[#071f52] transition-colors focus:bg-white focus:outline-none focus:ring-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm',
    invalid
      ? 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30'
      : 'border-[#071f52]/14 focus:border-[#071f52] focus:ring-[#ffd923]/60',
  )

  const mobileDigits = getPhilippineMobileDigits(profile.mobile)

  const profileFieldErrors = {
    first_name: showProfileValidation && isMissingRequiredValue(profile.first_name) ? 'First name is required.' : '',
    last_name: showProfileValidation && isMissingRequiredValue(profile.last_name) ? 'Last name is required.' : '',
    mobile: !showProfileValidation
      ? ''
      : isMissingRequiredValue(profile.mobile, 'mobile')
        ? 'Mobile number is required.'
        : mobileDigits.length !== 10
          ? 'Mobile number must be exactly 10 digits.'
          : '',
    address_line_1: showProfileValidation && isMissingRequiredValue(profile.address_line_1) ? 'Address line 1 is required.' : '',
    street_address: showProfileValidation && isMissingRequiredValue(profile.street_address) ? 'Street address is required.' : '',
    barangay: showProfileValidation && isMissingRequiredValue(profile.barangay) ? 'Barangay is required.' : '',
    city: showProfileValidation && isMissingRequiredValue(profile.city) ? 'City is required.' : '',
    province: showProfileValidation && isMissingRequiredValue(profile.province) ? 'Province is required.' : '',
    zip_code: showProfileValidation && isMissingRequiredValue(profile.zip_code) ? 'ZIP code is required.' : '',
    country: showProfileValidation && isMissingRequiredValue(profile.country) ? 'Country is required.' : '',
  }

  const invalidProfileFields = {
    first_name: Boolean(profileFieldErrors.first_name),
    last_name: Boolean(profileFieldErrors.last_name),
    mobile: Boolean(profileFieldErrors.mobile),
    address_line_1: Boolean(profileFieldErrors.address_line_1),
    street_address: Boolean(profileFieldErrors.street_address),
    barangay: Boolean(profileFieldErrors.barangay),
    city: Boolean(profileFieldErrors.city),
    province: Boolean(profileFieldErrors.province),
    zip_code: Boolean(profileFieldErrors.zip_code),
    country: Boolean(profileFieldErrors.country),
  }

  useEffect(() => {
    if (profileData) {
      const parsedAddress = parseProfileAddress(profileData.address)

      setProfile({
        first_name: profileData.first_name || user?.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: profileData.last_name || user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: profileData.email || user?.email || '',
        mobile: profileData.mobile ? normalizePhilippineMobile(profileData.mobile) : MOBILE_PREFIX,
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
    try {
      const ext = file.name.split('.').pop()
      const path = `profile-photos/${user.id}.${ext}`
      await uploadFile({ bucket: 'business-assets', file, path, policy: UPLOAD_POLICIES.businessAssets, upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(path)
      setProfile({ ...profile, profile_image_path: publicUrl })
      updateProfile.mutate({ id: user.id, data: { profile_image_path: publicUrl } })
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return
    setMessage('')
    setShowProfileValidation(true)

    if (mobileInputRef.current) {
      mobileInputRef.current.setCustomValidity(profileFieldErrors.mobile)
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
          mobile: normalizePhilippineMobile(profile.mobile),
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
          setMessage(showError(err))
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
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <h1 className="text-lg font-black tracking-[-0.02em] text-[#071f52] sm:text-2xl sm:tracking-[-0.03em]">My Profile</h1>
      <p className="mt-0.5 text-xs font-medium text-[#071f52]/58 sm:text-sm">Manage your personal information and password.</p>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-[#071f52]/10 bg-white p-4 shadow-[0_4px_16px_rgba(7,31,82,0.04)] sm:rounded-2xl sm:p-6 sm:shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#071f52] text-xl font-black text-white sm:h-16 sm:w-16 sm:text-2xl">
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
                className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd923] text-[#071f52] shadow-sm sm:bottom-1 sm:right-1 sm:h-6 sm:w-6"
              >
                <Camera size={10} className="sm:hidden" />
                <Camera size={12} className="hidden sm:block" />
              </button>
              <input ref={fileInputRef} type="file" accept={getAcceptedMimeTypes(UPLOAD_POLICIES.businessAssets)} onChange={handleUploadPhoto} className="hidden" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#071f52] sm:text-base">{name}</p>
              <p className="text-xs font-medium text-[#071f52]/48 sm:text-sm">{profile.email || user?.email}</p>
            </div>
          </div>

          <form noValidate onSubmit={handleSaveProfile} className="space-y-3 sm:space-y-4">
            <p className="px-1 py-0.5 text-[10px] font-black text-[#b91c1c] sm:py-1 sm:text-sm">
              Fields with (*) are required to make a booking.
            </p>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">First Name <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  aria-invalid={invalidProfileFields.first_name}
                  required
                  className={getProfileFieldClassName(invalidProfileFields.first_name)}
                />
                {profileFieldErrors.first_name ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.first_name}</p> : null}
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Last Name <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  aria-invalid={invalidProfileFields.last_name}
                  required
                  className={getProfileFieldClassName(invalidProfileFields.last_name)}
                />
                {profileFieldErrors.last_name ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.last_name}</p> : null}
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Email</label>
              <input
                value={profile.email || user?.email || ''}
                readOnly
                className="block w-full rounded-lg border border-[#071f52]/14 bg-gray-100 px-3 py-2 text-xs font-semibold text-[#071f52]/48 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
              />
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Mobile <span className="text-[#e92935]">*</span></label>
              <div className="relative">
                <Phone size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#071f52]/38 sm:left-3 sm:hidden" />
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38 hidden sm:block" />
                <input
                  ref={mobileInputRef}
                  value={profile.mobile}
                  onChange={(e) => {
                    const digits = getPhilippineMobileDigits(e.target.value)
                    e.target.setCustomValidity('')
                    setProfile({ ...profile, mobile: `${MOBILE_PREFIX}${digits}` })
                  }}
                  aria-invalid={invalidProfileFields.mobile}
                  required
                  inputMode="numeric"
                  maxLength={MOBILE_PREFIX.length + 10}
                  placeholder="+639171234567"
                  className={cn(
                    getProfileFieldClassName(invalidProfileFields.mobile),
                    'py-2 pl-8 pr-3 placeholder:text-[#071f52]/38 sm:py-2.5 sm:pl-9 sm:pr-4',
                  )}
                />
              </div>
              {profileFieldErrors.mobile ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.mobile}</p> : null}
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Address Line 1 <span className="text-[#e92935]">*</span></label>
              <input
                value={profile.address_line_1}
                onChange={(e) => setProfile({ ...profile, address_line_1: e.target.value })}
                aria-invalid={invalidProfileFields.address_line_1}
                required
                placeholder="Unit / House No. / Building"
                className={cn(getProfileFieldClassName(invalidProfileFields.address_line_1), 'placeholder:text-[#071f52]/38')}
              />
              {profileFieldErrors.address_line_1 ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.address_line_1}</p> : null}
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Address Line 2</label>
              <input
                value={profile.address_line_2}
                onChange={(e) => setProfile({ ...profile, address_line_2: e.target.value })}
                placeholder="Subdivision / Building Wing / Landmark"
                className={cn(getProfileFieldClassName(false), 'placeholder:text-[#071f52]/38')}
              />
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Street Address <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.street_address}
                  onChange={(e) => setProfile({ ...profile, street_address: e.target.value })}
                  aria-invalid={invalidProfileFields.street_address}
                  required
                  placeholder="Street name"
                  className={cn(getProfileFieldClassName(invalidProfileFields.street_address), 'placeholder:text-[#071f52]/38')}
                />
                {profileFieldErrors.street_address ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.street_address}</p> : null}
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Barangay <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.barangay}
                  onChange={(e) => setProfile({ ...profile, barangay: e.target.value })}
                  aria-invalid={invalidProfileFields.barangay}
                  required
                  placeholder="Barangay"
                  className={cn(getProfileFieldClassName(invalidProfileFields.barangay), 'placeholder:text-[#071f52]/38')}
                />
                {profileFieldErrors.barangay ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.barangay}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">City <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  aria-invalid={invalidProfileFields.city}
                  required
                  placeholder="Pasay City"
                  className={getProfileFieldClassName(invalidProfileFields.city)}
                />
                {profileFieldErrors.city ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.city}</p> : null}
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Province <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  aria-invalid={invalidProfileFields.province}
                  required
                  placeholder="Metro Manila"
                  className={getProfileFieldClassName(invalidProfileFields.province)}
                />
                {profileFieldErrors.province ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.province}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">ZIP Code <span className="text-[#e92935]">*</span></label>
                <input
                  value={profile.zip_code}
                  onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })}
                  aria-invalid={invalidProfileFields.zip_code}
                  required
                  placeholder="1309"
                  className={getProfileFieldClassName(invalidProfileFields.zip_code)}
                />
                {profileFieldErrors.zip_code ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.zip_code}</p> : null}
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">Country <span className="text-[#e92935]">*</span></label>
                <CountrySelect
                  value={profile.country}
                  onChange={(country) => setProfile({ ...profile, country })}
                  required
                  invalid={invalidProfileFields.country}
                />
                {profileFieldErrors.country ? <p className="text-[10px] font-bold text-[#b91c1c] sm:text-xs">{profileFieldErrors.country}</p> : null}
              </div>
            </div>

            <Button type="submit" disabled={saving} size="sm" className="w-full bg-[#071f52] text-xs text-white hover:bg-[#112458] sm:size-lg">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>

            {message && messageScope === 'profile' ? (
              <div className={cn(
                'rounded-lg border px-3 py-2.5 text-xs font-bold sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm',
                messageType === 'success'
                  ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]'
                  : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]',
              )}>
                {message}
              </div>
            ) : null}
          </form>
        </div>

        <div className="rounded-lg border border-[#071f52]/10 bg-white p-4 shadow-[0_4px_16px_rgba(7,31,82,0.04)] sm:rounded-2xl sm:p-6 sm:shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <h2 className="text-sm font-black tracking-[-0.02em] text-[#071f52] sm:text-lg">Change Password</h2>
          <p className="mt-0.5 text-xs font-medium text-[#071f52]/58 sm:text-sm">Update your password to keep your account secure.</p>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
            {(['current', 'new', 'confirm'] as const).map((field) => (
              <div key={field} className="space-y-1 sm:space-y-1.5">
                <label className="text-[10px] font-bold text-[#071f52] sm:text-xs">{field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm Password'}</label>
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
                      'block w-full rounded-lg border border-[#071f52]/14 bg-[#f7f9ff] px-3 py-2 pr-9 text-xs font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:border-[#071f52] focus:ring-[#ffd923]/60 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:pr-10 sm:text-sm',
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#071f52]/38 hover:text-[#071f52] sm:right-3"
                  >
                    {show[field] ? <EyeOff size={14} className="sm:hidden" /> : <Eye size={14} className="sm:hidden" />}
                    {show[field] ? <EyeOff size={16} className="hidden sm:block" /> : <Eye size={16} className="hidden sm:block" />}
                  </button>
                </div>
              </div>
            ))}

            <Button
              type="submit"
              disabled={!password.current || !password.new || !password.confirm || passwordSaving}
              size="sm"
              className="w-full bg-[#071f52] text-xs text-white hover:bg-[#112458] sm:size-lg"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </Button>

            {message && messageScope === 'password' ? (
              <div className={cn(
                'rounded-lg border px-3 py-2.5 text-xs font-bold sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm',
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
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6 animate-pulse">
      <div className="mb-1.5 h-7 w-36 rounded bg-[#071f52]/10 sm:mb-2 sm:h-8 sm:w-40" />
      <div className="mb-4 h-3.5 w-60 rounded bg-[#071f52]/8 sm:mb-6 sm:h-4 sm:w-72" />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-[#071f52]/10 bg-white p-4 sm:rounded-2xl sm:p-6">
          <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
            <div className="h-14 w-14 rounded-full bg-[#071f52]/10 sm:h-16 sm:w-16" />
            <div className="space-y-1.5 sm:space-y-2">
              <div className="h-3.5 w-28 rounded bg-[#071f52]/10 sm:h-4 sm:w-32" />
              <div className="h-2.5 w-44 rounded bg-[#071f52]/8 sm:h-3 sm:w-48" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
              <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            </div>
            <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
              <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            </div>
            <div className="h-9 rounded-lg bg-[#071f52]/10 sm:h-12 sm:rounded-2xl" />
          </div>
        </div>

        <div className="rounded-lg border border-[#071f52]/10 bg-white p-4 sm:rounded-2xl sm:p-6">
          <div className="mb-1.5 h-4 w-32 rounded bg-[#071f52]/10 sm:mb-2 sm:h-5 sm:w-36" />
          <div className="mb-4 h-2.5 w-56 rounded bg-[#071f52]/8 sm:mb-5 sm:h-3 sm:w-64" />
          <div className="space-y-3 sm:space-y-4">
            <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            <div className="h-10 rounded-lg bg-[#071f52]/6 sm:h-14 sm:rounded-2xl" />
            <div className="h-9 rounded-lg bg-[#071f52]/10 sm:h-12 sm:rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
