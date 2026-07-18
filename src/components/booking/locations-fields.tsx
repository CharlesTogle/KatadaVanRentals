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
      <p className="text-xs font-medium leading-5 text-[#071f52]/48 mb-3">
        {rentalType === 'with-driver'
          ? "Pickup & drop-off only, with a professional driver — the fare is based on the driving distance. No driver's license needed."
          : 'Enter your pickup, drop-off, and destination details.'}
      </p>
      <div className="space-y-3">
        <input value={locations.pickup} onChange={(e) => setLocations({ ...locations, pickup: e.target.value })}
          placeholder="Pickup location"
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />
        <input value={locations.dropoff} onChange={(e) => setLocations({ ...locations, dropoff: e.target.value })}
          placeholder="Drop-off location"
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />
        {rentalType === 'self-drive' && (
          <>
            <input value={locations.destination} onChange={(e) => setLocations({ ...locations, destination: e.target.value })}
              placeholder="Destination (optional)"
              className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
            />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#071f52]">Purpose of Travel</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)}
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              >
                <option value="">Select purpose…</option>
                {purposes.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
          </>
        )}
      </div>
    </>
  )
}
