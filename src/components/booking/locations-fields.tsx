import { useSearchParams } from 'react-router-dom'
import { useBookingStore } from '@/store/booking-store'

const purposes = [
  'Leisure/Vacation', 'Business/Work', 'Family Event', 'Funeral/Bereavement',
  'Medical/Health', 'School/Educational', 'Moving/Relocation', 'Airport Transfer', 'Other',
]

export function LocationsFields() {
  const [searchParams] = useSearchParams()
  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const locations = useBookingStore((s) => s.locations)
  const setLocations = useBookingStore((s) => s.setLocations)
  const purpose = useBookingStore((s) => s.purpose)
  const setPurpose = useBookingStore((s) => s.setPurpose)

  return (
    <>
      <p className="mb-3 text-sm font-medium leading-6 text-[#071f52]/48">
        {rentalType === 'with-driver'
          ? 'Set your route details and purpose so the team can review the trip properly.'
          : 'Confirm the pickup, return, and trip destination details for this booking.'}
      </p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Pick-up / Delivery Location <span className="text-[#e92935]">*</span></label>
          <input value={locations.pickup} onChange={(e) => setLocations({ ...locations, pickup: e.target.value })}
            placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Drop-off / Return Location <span className="text-[#e92935]">*</span></label>
          <input value={locations.dropoff} onChange={(e) => setLocations({ ...locations, dropoff: e.target.value })}
            placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Destination <span className="text-[#e92935]">*</span></label>
          <input value={locations.destination} onChange={(e) => setLocations({ ...locations, destination: e.target.value })}
            placeholder="e.g. Quezon City, Metro Manila"
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Purpose of Travel <span className="text-[#e92935]">*</span></label>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          >
            <option value="">Select purpose...</option>
            {purposes.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
      </div>
    </>
  )
}
