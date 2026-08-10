import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useCreateAdminBooking } from '@/hooks/use-admin-booking'
import { useAdminVehicles } from '@/hooks/use-vehicles'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { CustomerPicker, type CustomerPickerValue } from '@/components/admin/customer-picker'
import { BookingSection } from '@/components/booking/booking-section'
import { RentalDetailsFields } from '@/components/booking/rental-details-fields'
import { LocationsFields } from '@/components/booking/locations-fields'
import { PaymentFields } from '@/components/booking/payment-fields'
import { PriceSummary } from '@/components/booking/price-summary'
import { BookingFormSkeleton } from '@/components/booking/booking-form-skeleton'
import { CountrySelect } from '@/components/ui/country-select'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import { getBookingPriceBreakdown, isSameBookingLocation, normalizeCustomerRentalType, toBookingRentalModel, type CustomerRentalType } from '@/lib/booking-utils'
import { saveBookingDateSelection } from '@/lib/booking-date-storage'
import { calculateToll, getNearestTollPlazas, getRouteQuote } from '@/services/location-service'
import { UPLOAD_POLICIES } from '@/config/constants'
import { removeUploadedFileWithQueue, uploadFile } from '@/services/upload-service'
import { useBookingStore } from '@/store/booking-store'
import type { AdminBookingCreateInput } from '@/types/admin-booking'
import { useVatPercent } from '@/hooks/use-vat-percent'
import { logError, getRequestId } from '@/lib/logger'

const ADMIN_BOOKING_IDEMPOTENCY_KEY = 'katada:admin-booking:idempotency'
const MOBILE_PREFIX = '+63'

function getAdminBookingIdempotencyKeys() {
  const stored = localStorage.getItem(ADMIN_BOOKING_IDEMPOTENCY_KEY)
  if (stored) {
    try {
      const keys = JSON.parse(stored) as { booking: string; payment: string }
      if (keys.booking && keys.payment) return keys
    } catch {
      localStorage.removeItem(ADMIN_BOOKING_IDEMPOTENCY_KEY)
    }
  }

  const keys = { booking: crypto.randomUUID(), payment: crypto.randomUUID() }
  localStorage.setItem(ADMIN_BOOKING_IDEMPOTENCY_KEY, JSON.stringify(keys))
  return keys
}

type SelfDriveAddress = {
  addressLine1: string
  addressLine2: string
  streetAddress: string
  barangay: string
  city: string
  province: string
  zipCode: string
  country: string
}

const emptySelfDriveAddress: SelfDriveAddress = {
  addressLine1: '',
  addressLine2: '',
  streetAddress: '',
  barangay: '',
  city: '',
  province: '',
  zipCode: '',
  country: 'Philippines',
}

function isCompleteSelfDriveAddress(address: SelfDriveAddress) {
  return [
    address.addressLine1,
    address.streetAddress,
    address.barangay,
    address.city,
    address.province,
    address.country,
  ].every((part) => part.trim()) && /^\d{4}$/.test(address.zipCode.trim())
}

export function BookingCreateForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const vatPercent = useVatPercent()
  const createBooking = useCreateAdminBooking()
  const { data: vehicles = [], isLoading: vehiclesLoading } = useAdminVehicles()
  const paymentMethodsQuery = usePaymentMethods()
  const rentalType = normalizeCustomerRentalType(searchParams.get('type'))
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''
  const [customer, setCustomer] = useState<CustomerPickerValue>({
    mode: 'existing',
    existingCustomer: null,
    newCustomer: { firstName: '', lastName: '', email: '', mobile: '', sendInvite: true },
  })
  const [idempotencyKeys] = useState(getAdminBookingIdempotencyKeys)
  const [vehicleId, setVehicleId] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [tollLoading, setTollLoading] = useState(false)
  const [tollError, setTollError] = useState('')
  const [completeAddress, setCompleteAddress] = useState<SelfDriveAddress>(emptySelfDriveAddress)

  const mode = useBookingStore((s) => s.mode)
  const locations = useBookingStore((s) => s.locations)
  const routeSelections = useBookingStore((s) => s.routeSelections)
  const tollSelections = useBookingStore((s) => s.tollSelections)
  const routeQuote = useBookingStore((s) => s.routeQuote)
  const purpose = useBookingStore((s) => s.purpose)
  const notes = useBookingStore((s) => s.notes)
  const payment = useBookingStore((s) => s.payment)
  const receiptFile = useBookingStore((s) => s.receiptFile)
  const submitting = useBookingStore((s) => s.submitting)
  const error = useBookingStore((s) => s.error)
  const setSubmitting = useBookingStore((s) => s.setSubmitting)
  const setError = useBookingStore((s) => s.setError)
  const setNotes = useBookingStore((s) => s.setNotes)
  const setRouteSelection = useBookingStore((s) => s.setRouteSelection)
  const setRouteQuote = useBookingStore((s) => s.setRouteQuote)
  const setTollCandidates = useBookingStore((s) => s.setTollCandidates)
  const setTollRfidBreakdown = useBookingStore((s) => s.setTollRfidBreakdown)
  const reset = useBookingStore((s) => s.reset)

  useEffect(() => {
    reset()
    setCompleteAddress(emptySelfDriveAddress)
    return () => reset()
  }, [reset])

  useEffect(() => {
    if (!vehicleId) {
      setRouteLoading(false)
      setRouteError('')
      setRouteQuote(null)
      return
    }

    const hasPickup = routeSelections.pickup.lat != null && routeSelections.pickup.lng != null
    const needsDestination = rentalType === 'all-in' && mode === 'keep'
    const hasDestination = !needsDestination || (routeSelections.destination.lat != null && routeSelections.destination.lng != null)
    const hasDropoff = routeSelections.dropoff.lat != null && routeSelections.dropoff.lng != null

    if (!hasPickup || !hasDestination || !hasDropoff) {
      setRouteLoading(false)
      setRouteError('')
      setRouteQuote(null)
      return
    }

    let cancelled = false
    setRouteLoading(true)

    const routeQuoteTimeout = window.setTimeout(() => {
      void getRouteQuote({
        pickup: routeSelections.pickup,
        destination: needsDestination ? routeSelections.destination : undefined,
        dropoff: routeSelections.dropoff,
        vehicleId,
        rentalModel: toBookingRentalModel(rentalType),
      }).then((quote) => {
        if (cancelled) return
        setRouteQuote(quote)
        setRouteError('')
      }).catch((err) => {
        if (cancelled) return
        setRouteQuote(null)
        setRouteError(showError(err))
      }).finally(() => {
        if (!cancelled) setRouteLoading(false)
      })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(routeQuoteTimeout)
    }
  }, [locations.dropoff, locations.destination, locations.pickup, mode, rentalType, routeSelections.dropoff, routeSelections.destination, routeSelections.pickup, setRouteQuote, setRouteSelection, vehicleId])

  useEffect(() => {
    if (rentalType !== 'all-in' || routeQuote?.inServiceArea === false) {
      setTollCandidates([], [])
      setTollError('')
      return
    }

    const hasPickup = routeSelections.pickup.lat != null && routeSelections.pickup.lng != null
    const hasDropoff = routeSelections.dropoff.lat != null && routeSelections.dropoff.lng != null
    if (!hasPickup || !hasDropoff) {
      setTollCandidates([], [])
      setTollError('')
      return
    }

    let cancelled = false

    void getNearestTollPlazas({
      pickup: routeSelections.pickup,
      destination: mode === 'keep' ? routeSelections.destination : undefined,
      dropoff: routeSelections.dropoff,
      routeGeometry: routeQuote?.routeGeometry,
    }).then((result) => {
      if (cancelled) return
      setTollCandidates(result.entryCandidates, result.exitCandidates)
      setTollError('')
    }).catch((err) => {
      if (cancelled) return
      setTollCandidates([], [])
      setTollError(showError(err instanceof Error ? err : null))
    })

    return () => {
      cancelled = true
    }
  }, [mode, routeQuote?.routeGeometry, routeSelections.destination, routeSelections.dropoff, routeSelections.pickup, rentalType, setTollCandidates])

  useEffect(() => {
    if (rentalType !== 'all-in' || routeQuote?.inServiceArea === false || !routeQuote || !tollSelections.entry || !tollSelections.exit) {
      setTollLoading(false)
      setTollError('')
      return
    }

    const entryPlaza = tollSelections.entry
    const exitPlaza = tollSelections.exit
    const matchesCurrentSelection = routeQuote.tollEntryPlaza === entryPlaza.name
      && routeQuote.tollEntryExpressway === entryPlaza.expressway
      && routeQuote.tollExitPlaza === exitPlaza.name
      && routeQuote.tollExitExpressway === exitPlaza.expressway
      && routeQuote.tollVehicleClass === tollSelections.vehicleClass

    if (matchesCurrentSelection) {
      setTollLoading(false)
      return
    }

    let cancelled = false
    setTollLoading(true)

    void calculateToll({
      pickup: routeSelections.pickup,
      destination: mode === 'keep' ? routeSelections.destination : undefined,
      dropoff: routeSelections.dropoff,
      entryPlaza: entryPlaza.id,
      exitPlaza: exitPlaza.id,
      returnEntryPlaza: exitPlaza.id,
      returnExitPlaza: entryPlaza.id,
      vehicleClass: tollSelections.vehicleClass,
    }).then((result) => {
      if (cancelled) return
      setRouteQuote({ ...routeQuote, ...result })
      setTollRfidBreakdown(result.tollRfidBreakdown)
      setTollError('')
    }).catch((err) => {
      if (cancelled) return
      setRouteQuote({
        ...routeQuote,
        tollEstimateAmount: 0,
        tollSegments: [],
        tollEntryPlaza: entryPlaza.name,
        tollEntryExpressway: entryPlaza.expressway,
        tollExitPlaza: exitPlaza.name,
        tollExitExpressway: exitPlaza.expressway,
        tollVehicleClass: tollSelections.vehicleClass,
        tollRfidBreakdown: [],
      })
      setTollRfidBreakdown([])
      setTollError(showError(err instanceof Error ? err : null))
    }).finally(() => {
      if (!cancelled) setTollLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [mode, rentalType, routeQuote, routeSelections.dropoff, routeSelections.destination, routeSelections.pickup, setRouteQuote, setTollRfidBreakdown, tollSelections.entry, tollSelections.exit, tollSelections.vehicleClass])

  if (vehiclesLoading) {
    return <BookingFormSkeleton />
  }

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null
  const startDate = startParam ? new Date(startParam) : null
  const endDate = endParam ? new Date(endParam) : null
  const pricing = getBookingPriceBreakdown({
    rentalType,
    mode,
    startAt: startParam,
    endAt: endParam,
    basePricePerDay: selectedVehicle?.base_price_per_day ?? 0,
    distanceRatePerKm: selectedVehicle?.peso_per_km ?? 0,
    driverRatePerDay: selectedVehicle?.driver_rate_per_day ?? 0,
    carWashFee: selectedVehicle?.car_wash_fee ?? 0,
    deliveryFee: selectedVehicle?.delivery_fee ?? 0,
    securityDeposit: selectedVehicle?.security_deposit ?? 0,
    securityDepositType: selectedVehicle?.security_deposit_type ?? 'fixed',
    excessRatePerHour: selectedVehicle?.excess_rate_per_hour ?? 0,
    autoFullDayAfterHours: selectedVehicle?.auto_full_day_after_hours ?? 12,
    twelveHourRate: selectedVehicle?.twelve_hour_rate ?? null,
    routeQuote,
  })
  const needsRouteQuote = rentalType === 'all-in' || (mode === 'dropoff' && rentalType !== 'self-drive')
  const basePriceLoading = routeLoading && mode === 'dropoff' && rentalType !== 'self-drive'
  const fuelPriceLoading = routeLoading && rentalType === 'all-in' && routeQuote?.inServiceArea !== false
  const tollPriceLoading = rentalType === 'all-in' && (routeLoading || tollLoading) && routeQuote?.inServiceArea !== false
  const tollQuoteReady = !!routeQuote
    && !!tollSelections.entry
    && !!tollSelections.exit
    && routeQuote.tollEntryPlaza === tollSelections.entry.name
    && routeQuote.tollExitPlaza === tollSelections.exit.name
    && routeQuote.tollVehicleClass === tollSelections.vehicleClass
  const needsTollEstimate = rentalType === 'all-in' && routeQuote?.inServiceArea !== false && !tollQuoteReady
  const selfDriveAddressIncomplete = rentalType === 'self-drive' && !isCompleteSelfDriveAddress(completeAddress)
  const invalidSelfDriveZip = rentalType === 'self-drive' && completeAddress.zipCode.length !== 4
  const locationSelectionIncomplete = routeSelections.pickup.lat == null
    || routeSelections.dropoff.lat == null
    || ((mode === 'keep' || rentalType === 'self-drive') && routeSelections.destination.lat == null)
  const customerSelectionIncomplete = customer.mode === 'existing'
    ? !customer.existingCustomer?.id
    : !customer.newCustomer.firstName.trim() || !customer.newCustomer.lastName.trim() || !customer.newCustomer.email.trim()
  const routeIncomplete = needsRouteQuote && (routeSelections.pickup.lat == null || (rentalType === 'all-in' && mode === 'keep' && routeSelections.destination.lat == null) || routeSelections.dropoff.lat == null || !routeQuote)
  const paymentIncomplete = !payment.reference.trim()
  const isWithDriverDropoff = rentalType !== 'self-drive' && mode === 'dropoff'
  const sameDropoffLocation = isWithDriverDropoff && isSameBookingLocation(locations.pickup, locations.dropoff)
  const formIncomplete = customerSelectionIncomplete || locationSelectionIncomplete || sameDropoffLocation || !vehicleId || !startParam || (!endParam && !isWithDriverDropoff) || selfDriveAddressIncomplete || routeIncomplete || needsTollEstimate || tollLoading || paymentIncomplete || createBooking.isPending || paymentMethodsQuery.isLoading
  const selectedPaymentMethod = paymentMethodsQuery.data?.find((method) => method.id === payment.method)

  const uploadReceipt = async (paymentIdempotencyKey: string) => {
    if (!receiptFile) return null
    const path = `${user?.id || 'admin'}/${paymentIdempotencyKey}`
    await uploadFile({ bucket: 'payment-receipts', file: receiptFile, path, policy: UPLOAD_POLICIES.paymentReceipts, upsert: true })
    return path
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (customer.mode === 'existing' && !customer.existingCustomer?.id) {
      setError('Please select a customer.')
      return
    }
    if (customer.mode === 'new') {
      if (!customer.newCustomer.firstName.trim() || !customer.newCustomer.lastName.trim() || !customer.newCustomer.email.trim()) {
        setError('First name, last name, and email are required for a new customer.')
        return
      }
      const mobileDigits = customer.newCustomer.mobile.startsWith(MOBILE_PREFIX)
        ? customer.newCustomer.mobile.slice(MOBILE_PREFIX.length)
        : customer.newCustomer.mobile
      if (mobileDigits && !/^\d{10}$/.test(mobileDigits)) {
        setError('Enter a complete 10-digit mobile number after the +63 prefix.')
        return
      }
    }
    if (!selectedVehicle) {
      setError('Please select a vehicle.')
      return
    }
    if (locationSelectionIncomplete) {
      setError('Choose suggested pickup, destination, and drop-off locations so we can use the selected locations for this booking.')
      return
    }
    if (sameDropoffLocation) {
      setError('Pickup and drop-off locations must be different for a drop-off booking.')
      return
    }
    if (!startParam && !endParam) {
      setError('Please fill in the required booking details before submitting.')
      return
    }

    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    if (startDate && startDate <= todayEnd) {
      setError('Pick-up must be at least one day in advance.')
      return
    }
    if (!isWithDriverDropoff && endDate && startDate && endDate <= startDate) {
      setError('Return date and time must be after pick-up date and time.')
      return
    }

    if (rentalType === 'self-drive' && !isCompleteSelfDriveAddress(completeAddress)) {
      setError(/^\d{4}$/.test(completeAddress.zipCode.trim()) ? 'Please enter the complete address for this self-drive booking.' : 'ZIP code must be exactly 4 digits.')
      return
    }
    if (needsRouteQuote && (routeSelections.pickup.lat == null || (rentalType === 'all-in' && mode === 'keep' && routeSelections.destination.lat == null) || routeSelections.dropoff.lat == null || !routeQuote)) {
      setError(routeError || 'Choose suggested pickup, destination, and drop-off locations so we can compute your route estimate.')
      return
    }
    if (needsTollEstimate) {
      setError(tollError || 'Wait for the toll estimate to finish before submitting.')
      return
    }
    if (!payment.reference.trim()) {
      setError('Please enter the payment reference number.')
      return
    }

    setSubmitting(true)

    const bookingIdempotencyKey = idempotencyKeys.booking
    const paymentIdempotencyKey = idempotencyKeys.payment
    const receiptPath = receiptFile ? `${user?.id || 'admin'}/${paymentIdempotencyKey}` : null

    if (receiptPath) {
      try {
        await uploadReceipt(paymentIdempotencyKey)
      } catch (error) {
        logError('admin-booking', 'Payment receipt upload failed', error, { requestId: getRequestId() })
        setError('Receipt upload failed. Please try again.')
        setSubmitting(false)
        return
      }
    }

    const input: AdminBookingCreateInput = {
      customerMode: customer.mode,
      existingCustomerId: customer.existingCustomer?.id ?? null,
      newCustomer: customer.mode === 'new' ? customer.newCustomer : null,
      vehicleId: selectedVehicle.id,
      rentalModel: toBookingRentalModel(rentalType),
      bookingMode: mode,
      startAt: startDate?.toISOString() || '',
      endAt: isWithDriverDropoff ? null : endDate?.toISOString() || null,
      pickupLocation: locations.pickup || '',
      dropoffLocation: locations.dropoff || '',
      destination: mode === 'keep' ? locations.destination || '' : '',
      purposeOfTravel: mode === 'keep' ? purpose || '' : '',
      notes,
      pickupLat: routeSelections.pickup.lat,
      pickupLng: routeSelections.pickup.lng,
      dropoffLat: routeSelections.dropoff.lat,
      dropoffLng: routeSelections.dropoff.lng,
      distanceKm: routeQuote?.distanceKm ?? null,
      durationMinutes: routeQuote?.durationMinutes ?? null,
      fuelEstimateLiters: routeQuote?.fuelEstimateLiters ?? 0,
      fuelEstimateAmount: routeQuote?.fuelEstimateAmount ?? 0,
      tollEstimateAmount: routeQuote?.tollEstimateAmount ?? 0,
      tollSegments: routeQuote?.tollSegments ?? [],
      tollEntryPlaza: routeQuote?.tollEntryPlaza ?? null,
      tollEntryExpressway: routeQuote?.tollEntryExpressway ?? null,
      tollExitPlaza: routeQuote?.tollExitPlaza ?? null,
      tollExitExpressway: routeQuote?.tollExitExpressway ?? null,
      tollVehicleClass: routeQuote?.tollVehicleClass ?? tollSelections.vehicleClass,
      tollRfidBreakdown: routeQuote?.tollRfidBreakdown ?? [],
      selfDriveAddress: rentalType === 'self-drive' ? completeAddress : null,
      inServiceArea: routeQuote?.inServiceArea ?? true,
      flaggedForManualPricing: routeQuote?.inServiceArea === false,
      bookingIdempotencyKey,
      paymentIdempotencyKey,
      paymentMethodId: payment.method || null,
      paymentReference: payment.reference.trim() || null,
      paymentReceiptPath: receiptPath,
      paymentChannel: selectedPaymentMethod?.channel || 'cash',
    }

    try {
      const result = await createBooking.mutateAsync(input)

      localStorage.removeItem(ADMIN_BOOKING_IDEMPOTENCY_KEY)
      saveBookingDateSelection({
        start: startParam.split('T')[0],
        end: endParam.split('T')[0],
        availableVehicleIds: [],
      })
      reset()
      toast.success(`Booking ${result.bookingNumber} confirmed.`)
      navigate('/admin/bookings')
    } catch (err: any) {
      if (receiptPath) await removeUploadedFileWithQueue('payment-receipts', receiptPath).catch((cleanupError) => {
        logError('admin-booking', 'Failed to remove payment receipt after booking failure', cleanupError)
      })
      setError(err?.status === 409 ? err.message || 'Vehicle is not available for these dates.' : showError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          <BookingSection title="1. CUSTOMER SELECTION">
            <CustomerPicker value={customer} onChange={setCustomer} />
          </BookingSection>

          <BookingSection title="2. VEHICLE">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-booking-vehicle" className="text-sm font-bold text-[#071f52]">Vehicle <span className="text-[#e92935]">*</span></label>
                <select id="admin-booking-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60">
                  <option value="">Select vehicle...</option>
                  {vehicles.filter((vehicle) => {
                    if (!vehicle.is_available) return false
                    if (rentalType === 'self-drive' && vehicle.supports_self_drive === false) return false
                    if (rentalType === 'all-in' && vehicle.supports_all_in === false) return false
                    if (rentalType === 'all-out' && vehicle.supports_all_out === false) return false
                    return mode !== 'dropoff' || vehicle.supports_pickup_dropoff !== false
                  }).map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.name} ({vehicle.plate_number})</option>
                  ))}
                </select>
              </div>

              {selectedVehicle ? (
                <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-[24px] p-4 sm:p-5">
                  <img src={selectedVehicle.image_paths?.[0] || '/van-1.jpg'} alt={selectedVehicle.name} className="h-16 w-20 shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#071f52]">{selectedVehicle.name}</p>
                    <p className="mt-1 text-sm sm:text-base font-medium text-[#071f52]/52">
                      {selectedVehicle.brand || 'Toyota'} · {selectedVehicle.transmission || 'Manual'} · {selectedVehicle.passenger_count} seats
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </BookingSection>

          <BookingSection title="3. RENTAL DETAILS">
            <RentalDetailsFields vehicle={selectedVehicle} vehicleId={vehicleId} />
            {rentalType === 'self-drive' ? (
              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-booking-address-line-1" className="text-sm font-bold text-[#071f52]">Address Line 1 <span className="text-[#e92935]">*</span></label>
                  <input id="admin-booking-address-line-1" required value={completeAddress.addressLine1} onChange={(e) => setCompleteAddress({ ...completeAddress, addressLine1: e.target.value })} placeholder="Unit / House No. / Building" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="admin-booking-address-line-2" className="text-sm font-bold text-[#071f52]">Address Line 2</label>
                  <input id="admin-booking-address-line-2" value={completeAddress.addressLine2} onChange={(e) => setCompleteAddress({ ...completeAddress, addressLine2: e.target.value })} placeholder="Subdivision / Building Wing / Landmark" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-street-address" className="text-sm font-bold text-[#071f52]">Street Address <span className="text-[#e92935]">*</span></label>
                    <input id="admin-booking-street-address" required value={completeAddress.streetAddress} onChange={(e) => setCompleteAddress({ ...completeAddress, streetAddress: e.target.value })} placeholder="Street name" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-barangay" className="text-sm font-bold text-[#071f52]">Barangay <span className="text-[#e92935]">*</span></label>
                    <input id="admin-booking-barangay" required value={completeAddress.barangay} onChange={(e) => setCompleteAddress({ ...completeAddress, barangay: e.target.value })} placeholder="Barangay" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-city" className="text-sm font-bold text-[#071f52]">City <span className="text-[#e92935]">*</span></label>
                    <input id="admin-booking-city" required value={completeAddress.city} onChange={(e) => setCompleteAddress({ ...completeAddress, city: e.target.value })} placeholder="Pasay City" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-province" className="text-sm font-bold text-[#071f52]">Province <span className="text-[#e92935]">*</span></label>
                    <input id="admin-booking-province" required value={completeAddress.province} onChange={(e) => setCompleteAddress({ ...completeAddress, province: e.target.value })} placeholder="Metro Manila" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-zip-code" className="text-sm font-bold text-[#071f52]">ZIP Code <span className="text-[#e92935]">*</span></label>
                    <input id="admin-booking-zip-code" required value={completeAddress.zipCode} onChange={(e) => setCompleteAddress({ ...completeAddress, zipCode: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" maxLength={4} pattern="[0-9]{4}" aria-invalid={invalidSelfDriveZip} placeholder="1309" className={`block w-full rounded-2xl border bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:bg-white focus:outline-none focus:ring-2 ${invalidSelfDriveZip ? 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30' : 'border-[#071f52]/14 focus:border-[#071f52] focus:ring-[#ffd923]/60'}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-country" className="text-sm font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
                    <CountrySelect value={completeAddress.country} onChange={(country) => setCompleteAddress({ ...completeAddress, country })} required className="[&_button]:rounded-2xl [&_button]:px-4 [&_button]:py-3 [&_button]:text-base" />
                  </div>
                </div>
              </div>
            ) : null}
          </BookingSection>

          <BookingSection title="4. LOCATIONS">
            <LocationsFields />
          </BookingSection>

          <BookingSection title="5. PAYMENT">
            <PaymentFields depositAmount={pricing.deposit} methodRequired={false} receiptRequired={false} autoSelectMethod={false} />
          </BookingSection>

          <div className="card">
            <h2 className="mb-4 text-base font-black tracking-[-0.02em] text-[#071f52]">ADDITIONAL NOTES (OPTIONAL)</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any special requests, notes for the admin, accessibility needs, etc." className="block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
          </div>
        </div>

        <div className="lg:self-stretch">
          <div className="lg:sticky lg:top-6">
            <PriceSummary
              rentalType={rentalType as CustomerRentalType}
              bookingMode={mode}
              days={pricing.days}
              basePricePerDay={selectedVehicle?.base_price_per_day ?? 0}
              distanceRatePerKm={selectedVehicle?.peso_per_km ?? 0}
              driverRatePerDay={selectedVehicle?.driver_rate_per_day ?? 0}
              carWashFee={pricing.carWash}
              deliveryFee={pricing.delivery}
              securityDeposit={pricing.securityDeposit}
              securityDepositType={selectedVehicle?.security_deposit_type ?? 'fixed'}
              securityDepositValue={selectedVehicle?.security_deposit ?? 0}
              baseTotal={pricing.baseTotal}
              driverTotal={pricing.driverTotal}
              fuelEstimateAmount={pricing.fuelEstimateAmount}
              tollEstimateAmount={pricing.tollEstimateAmount}
              vatPercent={vatPercent}
              tollMessage={tollError}
              distanceKm={pricing.distanceKm}
              baseLoading={basePriceLoading}
              fuelLoading={fuelPriceLoading}
              tollLoading={tollPriceLoading}
              grandTotal={pricing.grandTotal}
              deposit={pricing.deposit}
              remaining={pricing.remaining}
              submitting={submitting}
              disabled={formIncomplete}
                disabledMessage={customerSelectionIncomplete ? 'Select a customer to continue.' : !vehicleId ? 'Select a vehicle to continue.' : (!startParam || (!endParam && !isWithDriverDropoff)) ? 'Pick-up and return dates are required unless this is a drop-off booking.' : locationSelectionIncomplete ? 'Pick suggested locations to continue.' : sameDropoffLocation ? 'Pickup and drop-off locations must be different.' : selfDriveAddressIncomplete ? 'Enter the full self-drive address.' : routeLoading ? 'Computing route estimate...' : routeError || (needsRouteQuote && !routeQuote ? 'Pick suggested locations to compute the route estimate.' : tollLoading ? 'Computing toll estimate...' : tollError || (needsTollEstimate ? 'Computing toll estimate...' : paymentIncomplete ? 'Reference number is required.' : undefined))}
              error={error}
              submitLabel="Confirm Booking"
              footerNote="Admin bookings are confirmed immediately after creation."
              flaggedForManualPricing={routeQuote?.inServiceArea === false}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
