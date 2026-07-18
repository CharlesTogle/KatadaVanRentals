import { useBookingStore } from '@/store/booking-store'

export function AddressFields() {
  const address = useBookingStore((s) => s.address)
  const setAddress = useBookingStore((s) => s.setAddress)

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#071f52]">Address</label>
        <input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })}
          placeholder="House / Street / Barangay"
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">City</label>
          <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">Province</label>
          <input value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })}
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">ZIP Code</label>
          <input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })}
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">Country</label>
          <select value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          >
            <option>Philippines</option>
          </select>
        </div>
      </div>
    </>
  )
}
