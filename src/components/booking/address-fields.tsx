import { useBookingStore } from '@/store/booking-store'

export function AddressFields() {
  const address = useBookingStore((s) => s.address)

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="booking-address" className="text-sm font-bold text-[#071f52]">Complete Address <span className="text-[#e92935]">*</span></label>
        <input id="booking-address" value={address.address} readOnly disabled
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="booking-city" className="text-sm font-bold text-[#071f52]">City <span className="text-[#e92935]">*</span></label>
          <input id="booking-city" value={address.city} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="booking-province" className="text-sm font-bold text-[#071f52]">Province <span className="text-[#e92935]">*</span></label>
          <input id="booking-province" value={address.province} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="booking-zip" className="text-sm font-bold text-[#071f52]">ZIP Code <span className="text-[#e92935]">*</span></label>
          <input id="booking-zip" value={address.zip} readOnly disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="booking-country" className="text-sm font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
          <select id="booking-country" value={address.country} disabled
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/60"
          >
            <option>Philippines</option>
          </select>
        </div>
      </div>
    </>
  )
}
