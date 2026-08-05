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
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import { getBookingPriceBreakdown, normalizeCustomerRentalType, toBookingRentalModel, type CustomerRentalType } from '@/lib/booking-utils'
import { calculateToll, getNearestTollPlazas, getRouteQuote, suggestLocations } from '@/services/location-service'
import { supabase } from '@/lib/supabase'
import { useBookingStore } from '@/store/booking-store'
import type { AdminBookingCreateInput } from '@/types/admin-booking'

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

function formatSelfDriveAddress(address: SelfDriveAddress) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.streetAddress,
    address.barangay,
    address.city,
    address.province,
    address.zipCode,
    address.country,
  ].map((part) => part.trim()).filter(Boolean).join(', ')
}

export function BookingCreateForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
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
      let cancelled = false
      const canResolvePickup = !hasPickup && locations.pickup.trim().length >= 3
      const canResolveDestination = needsDestination && !hasDestination && locations.destination.trim().length >= 3
      const canResolveDropoff = !hasDropoff && locations.dropoff.trim().length >= 3
      setRouteLoading(canResolvePickup || canResolveDestination || canResolveDropoff)

      const autoResolveTimeout = window.setTimeout(() => {
        void Promise.all([
          canResolvePickup ? suggestLocations(locations.pickup).then((results) => results[0] ?? null) : null,
          canResolveDestination ? suggestLocations(locations.destination).then((results) => results[0] ?? null) : null,
          canResolveDropoff ? suggestLocations(locations.dropoff).then((results) => results[0] ?? null) : null,
        ]).then(([pickup, destination, dropoff]) => {
          if (cancelled) return
          if (pickup) setRouteSelection('pickup', pickup)
          if (destination) setRouteSelection('destination', destination)
          if (dropoff) setRouteSelection('dropoff', dropoff)
          if (!pickup && !destination && !dropoff) setRouteLoading(false)
          if (pickup || destination || dropoff) setRouteError('')
        }).catch(() => {
          if (!cancelled) setRouteLoading(false)
        })
      }, 300)

      setRouteQuote(null)
      return () => {
        cancelled = true
        window.clearTimeout(autoResolveTimeout)
      }
    }

    let cancelled = false
    setRouteLoading(true)

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
      setRouteError(err instanceof Error ? err.message : 'Failed to compute route quote')
    }).finally(() => {
      if (!cancelled) setRouteLoading(false)
    })

    return () => {
      cancelled = true
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
    driverRatePerDay: selectedVehicle?.driver_rate_per_day ?? 0,
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
  const selfDriveAddressIncomplete = rentalType === 'self-drive' && !formatSelfDriveAddress(completeAddress)
  const routeIncomplete = needsRouteQuote && (routeSelections.pickup.lat == null || (rentalType === 'all-in' && mode === 'keep' && routeSelections.destination.lat == null) || routeSelections.dropoff.lat == null || !routeQuote)
  const paymentIncomplete = !payment.reference.trim()
  const isWithDriverDropoff = rentalType !== 'self-drive' && mode === 'dropoff'
  const formIncomplete = !vehicleId || !startParam || (!endParam && !isWithDriverDropoff) || selfDriveAddressIncomplete || routeIncomplete || needsTollEstimate || tollLoading || paymentIncomplete || createBooking.isPending || paymentMethodsQuery.isLoading
  const selectedPaymentMethod = paymentMethodsQuery.data?.find((method) => method.id === payment.method)

  const uploadReceipt = async (bookingId: string) => {
    if (!receiptFile) return null
    const ext = receiptFile.name.split('.').pop()
    const path = `${bookingId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('payment-receipts').upload(path, receiptFile)
    if (uploadError) throw uploadError
    return path
  }

  const recordDepositPayment = async (bookingId: string) => {
    const receiptPath = await uploadReceipt(bookingId)
    const channel = selectedPaymentMethod?.channel || 'cash'
    const { error: paymentError } = await supabase.from('payments').insert({
      booking_id: bookingId,
      payment_method_id: payment.method || null,
      channel,
      status: 'verified',
      amount: pricing.deposit,
      reference_number: payment.reference.trim(),
      receipt_path: receiptPath,
      paid_at: new Date().toISOString(),
      submitted_by: user?.id ?? null,
      verified_by: user?.id ?? null,
      verified_at: new Date().toISOString(),
    })
    if (paymentError) throw paymentError
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
    }
    if (!selectedVehicle) {
      setError('Please select a vehicle.')
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

    const bookingAddress = formatSelfDriveAddress(completeAddress)
    if (rentalType === 'self-drive' && !bookingAddress) {
      setError('Please enter the complete address for this self-drive booking.')
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
    }

    try {
      const result = await createBooking.mutateAsync(input)

      try {
        await recordDepositPayment(result.bookingId)
      } catch (paymentError) {
        reset()
        toast.error(`Booking ${result.bookingNumber} was confirmed, but the deposit record could not be saved: ${showError(paymentError as Error)}`)
        navigate('/admin/bookings')
        return
      }

      reset()
      toast.success(`Booking ${result.bookingNumber} confirmed.`)
      navigate('/admin/bookings')
    } catch (err: any) {
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
                  {vehicles.filter((vehicle) => vehicle.is_available).map((vehicle) => (
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
                      {selectedVehicle.brand_id || 'Toyota'} · {selectedVehicle.transmission || 'Manual'} · {selectedVehicle.passenger_count} seats
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </BookingSection>

          <BookingSection title="3. RENTAL DETAILS">
            <RentalDetailsFields />
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
                    <input id="admin-booking-zip-code" required value={completeAddress.zipCode} onChange={(e) => setCompleteAddress({ ...completeAddress, zipCode: e.target.value })} placeholder="1309" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="admin-booking-country" className="text-sm font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
                    <select id="admin-booking-country" required value={completeAddress.country} onChange={(e) => setCompleteAddress({ ...completeAddress, country: e.target.value })} className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60">
                      <option value="Philippines">Philippines</option>
                    </select>
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

        <div className="h-full">
          <div className="lg:sticky lg:top-6">
            <PriceSummary
              rentalType={rentalType as CustomerRentalType}
              bookingMode={mode}
              days={pricing.days}
              basePricePerDay={selectedVehicle?.base_price_per_day ?? 0}
              driverRatePerDay={selectedVehicle?.driver_rate_per_day ?? 0}
              baseTotal={pricing.baseTotal}
              driverTotal={pricing.driverTotal}
              fuelEstimateAmount={pricing.fuelEstimateAmount}
              tollEstimateAmount={pricing.tollEstimateAmount}
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
              disabledMessage={!vehicleId ? 'Select a vehicle to continue.' : (!startParam || (!endParam && !isWithDriverDropoff)) ? 'Pick-up and return dates are required unless this is a drop-off booking.' : selfDriveAddressIncomplete ? 'Enter the full self-drive address.' : routeLoading ? 'Computing route estimate...' : routeError || (needsRouteQuote && !routeQuote ? 'Pick suggested locations to compute the route estimate.' : tollLoading ? 'Computing toll estimate...' : tollError || (needsTollEstimate ? 'Computing toll estimate...' : paymentIncomplete ? 'Reference number is required.' : undefined))}
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
