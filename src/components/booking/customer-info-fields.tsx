import { useBookingStore } from '@/store/booking-store'

export function CustomerInfoFields() {
  const profile = useBookingStore((s) => s.profile)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="booking-email" className="text-sm font-bold text-[#071f52]">Email Address <span className="text-[#e92935]">*</span></label>
          <input id="booking-email" value={profile.email} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="booking-mobile" className="text-sm font-bold text-[#071f52]">Mobile Number <span className="text-[#e92935]">*</span></label>
          <input id="booking-mobile" value={profile.mobile} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="booking-first-name" className="text-sm font-bold text-[#071f52]">First Name <span className="text-[#e92935]">*</span></label>
          <input id="booking-first-name" value={profile.first_name} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="booking-last-name" className="text-sm font-bold text-[#071f52]">Last Name <span className="text-[#e92935]">*</span></label>
          <input id="booking-last-name" value={profile.last_name} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
      </div>
    </>
  )
}
