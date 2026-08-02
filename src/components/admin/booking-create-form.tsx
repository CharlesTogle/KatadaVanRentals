import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateAdminBooking } from '@/hooks/use-admin-booking'
import { useAdminVehicles } from '@/hooks/use-vehicles'
import { CustomerPicker, type CustomerPickerValue } from '@/components/admin/customer-picker'
import { LocationSelector } from '@/components/booking/location-selector'
import { TollPlazaConfirmation } from '@/components/booking/toll-plaza-confirmation'
import { BookingPricePreview } from '@/components/admin/booking-price-preview'
import { Button } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { calculateToll, getNearestTollPlazas, getRouteQuote } from '@/services/location-service'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import type { AdminBookingCreateInput } from '@/types/admin-booking'
import type { RouteQuoteResponse, SelectedLocation, TollPlazaOption } from '@/types/location'

const inputClass = 'w-full rounded-xl border border-[#071f52]/14 bg-white py-2 px-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
const labelClass = 'text-xs font-bold text-[#071f52]/58 mb-1 block'

export function BookingCreateForm() {
  const navigate = useNavigate()
  const createBooking = useCreateAdminBooking()
  const { data: vehicles = [] } = useAdminVehicles()

  const [customer, setCustomer] = useState<CustomerPickerValue>({
    mode: 'existing',
    existingCustomer: null,
    newCustomer: { firstName: '', lastName: '', email: '', mobile: '', sendInvite: true },
  })
  const [vehicleId, setVehicleId] = useState('')
  const [rentalModel, setRentalModel] = useState<'all_out' | 'self_drive' | 'all_in' | ''>('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupSelection, setPickupSelection] = useState<SelectedLocation>({ address: '', lat: null, lng: null })
  const [dropoffSelection, setDropoffSelection] = useState<SelectedLocation>({ address: '', lat: null, lng: null })
  const [routeQuote, setRouteQuote] = useState<RouteQuoteResponse | null>(null)
  const [entryCandidates, setEntryCandidates] = useState<TollPlazaOption[]>([])
  const [exitCandidates, setExitCandidates] = useState<TollPlazaOption[]>([])
  const [entryPlaza, setEntryPlaza] = useState<TollPlazaOption | null>(null)
  const [exitPlaza, setExitPlaza] = useState<TollPlazaOption | null>(null)
  const [tollLoading, setTollLoading] = useState(false)
  const [tollError, setTollError] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [conflictError, setConflictError] = useState('')
  const [formError, setFormError] = useState('')

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null

  useEffect(() => {
    if (rentalModel !== 'all_in') {
      setRouteQuote(null)
      setEntryCandidates([])
      setExitCandidates([])
      setEntryPlaza(null)
      setExitPlaza(null)
      setTollError('')
      return
    }

    if (pickupSelection.lat == null || pickupSelection.lng == null || dropoffSelection.lat == null || dropoffSelection.lng == null) {
      setRouteQuote(null)
      setEntryCandidates([])
      setExitCandidates([])
      setEntryPlaza(null)
      setExitPlaza(null)
      setTollError('')
      return
    }

    let cancelled = false

    void Promise.all([
      getRouteQuote({
        pickup: pickupSelection,
        dropoff: dropoffSelection,
        vehicleId,
        rentalModel: 'all_in',
      }),
      getNearestTollPlazas({
        pickup: pickupSelection,
        dropoff: dropoffSelection,
      }),
    ]).then(([quote, plazas]) => {
      if (cancelled) return
      setRouteQuote(quote)
      setEntryCandidates(plazas.entryCandidates)
      setExitCandidates(plazas.exitCandidates)
      setEntryPlaza((current) => plazas.entryCandidates.find((candidate) => candidate.id === current?.id) ?? null)
      setExitPlaza((current) => plazas.exitCandidates.find((candidate) => candidate.id === current?.id) ?? null)
      setTollError('')
    }).catch((err) => {
      if (cancelled) return
      setRouteQuote(null)
      setEntryCandidates([])
      setExitCandidates([])
      setEntryPlaza(null)
      setExitPlaza(null)
      setTollError(showError(err instanceof Error ? err : null))
    })

    return () => {
      cancelled = true
    }
  }, [dropoffSelection, pickupSelection, rentalModel, vehicleId])

  useEffect(() => {
    if (rentalModel !== 'all_in' || !routeQuote || !entryPlaza || !exitPlaza) {
      setTollLoading(false)
      return
    }

    const matchesCurrentSelection = routeQuote.tollEntryPlaza === entryPlaza.name
      && routeQuote.tollEntryExpressway === entryPlaza.expressway
      && routeQuote.tollExitPlaza === exitPlaza.name
      && routeQuote.tollExitExpressway === exitPlaza.expressway
      && routeQuote.tollVehicleClass === 1

    if (matchesCurrentSelection) {
      setTollLoading(false)
      return
    }

    let cancelled = false
    setTollLoading(true)

    void calculateToll({
      pickup: pickupSelection,
      dropoff: dropoffSelection,
      entryPlaza: entryPlaza.id,
      exitPlaza: exitPlaza.id,
      vehicleClass: 1,
    }).then((result) => {
      if (cancelled) return
      setRouteQuote((current) => current ? { ...current, ...result } : current)
      setTollError('')
    }).catch((err) => {
      if (cancelled) return
      setRouteQuote((current) => current ? {
        ...current,
        tollEstimateAmount: 0,
        tollSegments: [],
        tollEntryPlaza: entryPlaza.name,
        tollEntryExpressway: entryPlaza.expressway,
        tollExitPlaza: exitPlaza.name,
        tollExitExpressway: exitPlaza.expressway,
        tollVehicleClass: 1,
        tollRfidBreakdown: [],
      } : current)
      setTollError(showError(err instanceof Error ? err : null))
    }).finally(() => {
      if (!cancelled) setTollLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [dropoffSelection, entryPlaza, exitPlaza, pickupSelection, rentalModel, routeQuote])

  const allFieldsEmpty = !startAt && !endAt && !vehicleId && !rentalModel
    && (customer.mode === 'existing' ? !customer.existingCustomer?.id
      : !customer.newCustomer.firstName.trim() && !customer.newCustomer.lastName.trim() && !customer.newCustomer.email.trim())

  const validate = (): string | null => {
    if (customer.mode === 'existing' && !customer.existingCustomer?.id) {
      return 'Please select a customer.'
    }
    if (customer.mode === 'new') {
      if (!customer.newCustomer.firstName.trim()) return 'First name is required.'
      if (!customer.newCustomer.lastName.trim()) return 'Last name is required.'
      if (!customer.newCustomer.email.trim()) return 'Email is required.'
    }
    if (!vehicleId) return 'Please select a vehicle.'
    if (!rentalModel) return 'Please select a rental model.'
    if (!startAt) return 'Pick-up date & time is required.'
    if (!endAt) return 'Drop-off date & time is required.'
    if (new Date(endAt) <= new Date(startAt)) return 'Drop-off must be after pick-up.'
    if (rentalModel === 'all_in' && (pickupSelection.lat == null || dropoffSelection.lat == null)) {
      return 'Choose a suggested pickup and drop-off location for All In bookings.'
    }
    if (rentalModel === 'all_in' && (!entryPlaza || !exitPlaza)) {
      return 'Confirm the toll plazas for this All In booking.'
    }
    if (rentalModel === 'all_in' && tollError) {
      return tollError
    }
    if (depositAmount && (Number(depositAmount) < 0)) return 'Deposit cannot be negative.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConflictError('')
    setFormError('')

    if (allFieldsEmpty) {
      setFormError('Please fill in the required booking details before submitting.')
      return
    }

    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    let nextRouteQuote = routeQuote

    if (rentalModel === 'all_in') {
      try {
        const baseQuote = await getRouteQuote({
          pickup: pickupSelection,
          dropoff: dropoffSelection,
          vehicleId,
          rentalModel: 'all_in',
        })
        const tollQuote = await calculateToll({
          pickup: pickupSelection,
          dropoff: dropoffSelection,
          entryPlaza: entryPlaza!.id,
          exitPlaza: exitPlaza!.id,
          vehicleClass: 1,
        })
        nextRouteQuote = { ...baseQuote, ...tollQuote }
        setRouteQuote(nextRouteQuote)
      } catch (err) {
        toast.error(showError(err instanceof Error ? err : null))
        return
      }
    }

    const input: AdminBookingCreateInput = {
      customerMode: customer.mode,
      existingCustomerId: customer.existingCustomer?.id ?? null,
      newCustomer: customer.mode === 'new' ? customer.newCustomer : null,
      vehicleId,
      rentalModel: rentalModel as AdminBookingCreateInput['rentalModel'],
      startAt,
      endAt,
      pickupLocation,
      dropoffLocation,
      depositAmount,
      pickupLat: pickupSelection.lat,
      pickupLng: pickupSelection.lng,
      dropoffLat: dropoffSelection.lat,
      dropoffLng: dropoffSelection.lng,
      distanceKm: nextRouteQuote?.distanceKm ?? null,
      durationMinutes: nextRouteQuote?.durationMinutes ?? null,
      fuelEstimateLiters: nextRouteQuote?.fuelEstimateLiters ?? 0,
      fuelEstimateAmount: nextRouteQuote?.fuelEstimateAmount ?? 0,
      tollEstimateAmount: nextRouteQuote?.tollEstimateAmount ?? 0,
      tollSegments: nextRouteQuote?.tollSegments ?? [],
      tollEntryPlaza: nextRouteQuote?.tollEntryPlaza ?? null,
      tollEntryExpressway: nextRouteQuote?.tollEntryExpressway ?? null,
      tollExitPlaza: nextRouteQuote?.tollExitPlaza ?? null,
      tollExitExpressway: nextRouteQuote?.tollExitExpressway ?? null,
      tollVehicleClass: nextRouteQuote?.tollVehicleClass ?? 1,
      tollRfidBreakdown: nextRouteQuote?.tollRfidBreakdown ?? [],
    }

    try {
      const result = await createBooking.mutateAsync(input)
      toast.success(`Booking ${result.bookingNumber} confirmed.`)
      navigate('/admin/bookings')
    } catch (err: any) {
      if (err?.status === 409) {
        setConflictError(err.message || 'Vehicle is not available for these dates.')
      } else {
        toast.error(showError(err))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Customer */}
        <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#071f52]">Customer</h2>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </section>

        {/* Vehicle & Rental Details */}
        <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#071f52]">Rental Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Vehicle *</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass}>
                <option value="">Select vehicle...</option>
                {vehicles.filter((v) => v.is_available).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rental model *</label>
              <select value={rentalModel} onChange={(e) => setRentalModel(e.target.value as any)} className={inputClass}>
                <option value="">Select...</option>
                <option value="self_drive">Self-drive</option>
                <option value="all_out">All-out (with driver)</option>
                <option value="all_in">All-in (with driver)</option>
              </select>
            </div>
            <div />
            <div>
              <DateTimePicker
                id="admin-booking-start-at"
                label="Pick-up date & time"
                required
                value={startAt}
                placeholder="Select date & time"
                onChange={setStartAt}
                labelClassName={labelClass}
                triggerClassName="min-h-[42px] rounded-xl bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <DateTimePicker
                id="admin-booking-end-at"
                label="Drop-off date & time"
                required
                value={endAt}
                placeholder="Select date & time"
                onChange={setEndAt}
                labelClassName={labelClass}
                triggerClassName="min-h-[42px] rounded-xl bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <LocationSelector
                id="admin-booking-pickup-location"
                label="Pick-up location"
                value={pickupLocation}
                placeholder="Search pickup address"
                onChange={setPickupLocation}
                onSelect={setPickupSelection}
              />
            </div>
            <div>
              <LocationSelector
                id="admin-booking-dropoff-location"
                label="Drop-off location"
                value={dropoffLocation}
                placeholder="Search drop-off address"
                onChange={setDropoffLocation}
                onSelect={setDropoffSelection}
              />
            </div>
            {rentalModel === 'all_in' ? (
              <div className="sm:col-span-2">
                <TollPlazaConfirmation
                  entryCandidates={entryCandidates}
                  exitCandidates={exitCandidates}
                  selectedEntry={entryPlaza}
                  selectedExit={exitPlaza}
                  loading={tollLoading}
                  error={tollError}
                  tollEstimateAmount={routeQuote?.tollEstimateAmount ?? 0}
                  rfidBreakdown={routeQuote?.tollRfidBreakdown ?? []}
                  onEntrySelect={setEntryPlaza}
                  onExitSelect={setExitPlaza}
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* Deposit */}
        <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#071f52]">Deposit (optional)</h2>
          <div className="max-w-xs">
            <label className={labelClass}>Deposit amount (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <p className="mt-2 text-xs text-[#071f52]/38">Leave blank or 0 to skip. Deposit is recorded as paid immediately.</p>
        </section>
      </div>

      {/* Right sidebar — preview & actions */}
      <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <BookingPricePreview
          vehicle={selectedVehicle}
          rentalModel={rentalModel}
          startAt={startAt}
          endAt={endAt}
          routeQuote={routeQuote}
          tollMessage={tollError}
        />

        {conflictError && (
          <div className="rounded-xl border border-[#e92935]/20 bg-[#e92935]/5 p-4 text-sm font-semibold text-[#e92935]">
            {conflictError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/bookings')} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createBooking.isPending || allFieldsEmpty} className="flex-1">
            {createBooking.isPending ? 'Confirming...' : 'Record deposit & Confirm booking'}
          </Button>
        </div>

        {formError ? (
          <div className="mt-4 text-center text-sm font-medium text-[#e92935]">{formError}</div>
        ) : null}
      </div>
    </form>
  )
}
