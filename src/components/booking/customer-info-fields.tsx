import { useBookingStore } from '@/store/booking-store'

export function CustomerInfoFields() {
  const profile = useBookingStore((s) => s.profile)
  const setProfile = useBookingStore((s) => s.setProfile)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">First Name</label>
          <input value={profile.first_name} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">Last Name</label>
          <input value={profile.last_name} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/60"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">Email</label>
          <input value={profile.email} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">Mobile</label>
          <input value={profile.mobile} onChange={(e) => {
            const val = e.target.value
            setProfile({ ...profile, mobile: val.startsWith('+63 ') ? val : '+63 ' })
          }}
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
      </div>
    </>
  )
}
