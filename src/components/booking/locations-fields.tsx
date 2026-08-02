import { useSearchParams } from 'react-router-dom'
import { LocationSelector } from '@/components/booking/location-selector'
import { normalizeCustomerRentalType } from '@/lib/booking-utils'
import { useBookingStore } from '@/store/booking-store'

const purposes = [
  'Leisure/Vacation', 'Business/Work', 'Family Event', 'Funeral/Bereavement',
  'Medical/Health', 'School/Educational', 'Moving/Relocation', 'Airport Transfer', 'Other',
]

export function LocationsFields() {
  const [searchParams] = useSearchParams()
  const rentalType = normalizeCustomerRentalType(searchParams.get('type'))
  const locations = useBookingStore((s) => s.locations)
  const mode = useBookingStore((s) => s.mode)
  const returnDifferentLocation = useBookingStore((s) => s.returnDifferentLocation)
  const setLocations = useBookingStore((s) => s.setLocations)
  const setReturnDifferentLocation = useBookingStore((s) => s.setReturnDifferentLocation)
  const routeSelections = useBookingStore((s) => s.routeSelections)
  const setRouteSelection = useBookingStore((s) => s.setRouteSelection)
  const purpose = useBookingStore((s) => s.purpose)
  const setPurpose = useBookingStore((s) => s.setPurpose)

  return (
    <>
      <p className="mb-3 text-sm font-medium leading-6 text-[#071f52]/48">
        {rentalType !== 'self-drive'
          ? mode === 'dropoff'
            ? 'Set your pickup and drop-off so we can compute the drop-off route.'
            : 'Set your route details and purpose so the team can review the trip properly.'
          : 'Confirm the pickup, return, and trip destination details for this booking.'}
      </p>
      <div className="space-y-3">
        {mode === 'dropoff' && rentalType !== 'self-drive' ? (
          <>
            <LocationSelector
              id="booking-pickup-location"
              label="Pickup Location"
              required
              value={locations.pickup}
              placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
              onChange={(value) => setLocations({ pickup: value })}
              onSelect={(selection) => setRouteSelection('pickup', selection)}
            />
            <LocationSelector
              id="booking-dropoff-location"
              label="Drop-off Location"
              required
              value={locations.dropoff}
              placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
              onChange={(value) => setLocations({ dropoff: value })}
              onSelect={(selection) => setRouteSelection('dropoff', selection)}
            />
          </>
        ) : (
          <>
            <div className="mb-0">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnDifferentLocation}
                  onChange={(e) => setReturnDifferentLocation(e.target.checked)}
                  className="h-4 w-4 rounded border-[#071f52]/20 text-[#071f52] accent-[#071f52]"
                />
                <span className="text-sm font-bold text-[#071f52]">Return at a different location</span>
              </label>
            </div>
            {returnDifferentLocation ? (
              <>
                <LocationSelector
                  id="booking-pickup-location"
                  label="Pick-up / Delivery Location"
                  required
                  value={locations.pickup}
                  placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
                  onChange={(value) => setLocations({ pickup: value })}
                  onSelect={(selection) => setRouteSelection('pickup', selection)}
                />
                <LocationSelector
                  id="booking-dropoff-location"
                  label="Drop-off / Return Location"
                  required
                  value={locations.dropoff}
                  placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
                  onChange={(value) => setLocations({ dropoff: value })}
                  onSelect={(selection) => setRouteSelection('dropoff', selection)}
                />
              </>
            ) : (
              <LocationSelector
                id="booking-pickup-location"
                label="Delivery & Return Location"
                required
                value={locations.pickup}
                placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila"
                onChange={(value) => setLocations({ pickup: value, dropoff: value })}
                onSelect={(selection) => {
                  setRouteSelection('pickup', selection)
                  setRouteSelection('dropoff', selection)
                }}
              />
            )}
          </>
        )}
        {rentalType === 'all-in' ? (
          <LocationSelector
            id="booking-destination"
            label="Destination"
            required
            value={locations.destination}
            placeholder="e.g. Baguio City, Benguet"
            onChange={(value) => setLocations({ destination: value })}
            onSelect={(selection) => setRouteSelection('destination', selection)}
          />
        ) : null}
        {(rentalType === 'all-in' || (mode === 'dropoff' && rentalType !== 'self-drive')) && (routeSelections.pickup.lat == null || (rentalType === 'all-in' && routeSelections.destination.lat == null) || routeSelections.dropoff.lat == null) ? (
          <p className="text-sm font-semibold text-[#e92935]">Choose suggested pickup, destination, and drop-off locations so we can compute the route estimate.</p>
        ) : null}
        {(mode === 'keep' && rentalType !== 'all-in') || rentalType === 'self-drive' ? (
          <>
            <LocationSelector
              id="booking-destination"
              label="Destination"
              required
              value={locations.destination}
              placeholder="e.g. Quezon City, Metro Manila"
              onChange={(value) => setLocations({ destination: value })}
              onSelect={() => {}}
            />
            <div className="space-y-1.5">
              <label htmlFor="booking-purpose" className="text-sm font-bold text-[#071f52]">Purpose of Travel <span className="text-[#e92935]">*</span></label>
              <select id="booking-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              >
                <option value="">Select purpose...</option>
                {purposes.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
