import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { useVehicleById } from '@/hooks/use-vehicles'
import { useProfile } from '@/hooks/use-profile'
import { useCustomerDocuments } from '@/hooks/use-documents'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { BookingSection } from '@/components/booking/booking-section'
import { RentalDetailsFields } from '@/components/booking/rental-details-fields'
import { LocationsFields } from '@/components/booking/locations-fields'
import { PaymentFields } from '@/components/booking/payment-fields'
import { PriceSummary } from '@/components/booking/price-summary'
import { BookingFormSkeleton } from '@/components/booking/booking-form-skeleton'
import { showError } from '@/lib/errors'
import { getBookingPriceBreakdown, getMissingSelfDriveDocuments, hasRequiredSelfDriveDocuments, normalizeCustomerRentalType, toBookingRentalModel, type CustomerRentalType } from '@/lib/booking-utils'
import { loadBookingDateSelection, saveBookingDateSelection } from '@/lib/booking-date-storage'
import { calculateToll, getNearestTollPlazas, getRouteQuote, suggestLocations } from '@/services/location-service'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query'
import { useBookingStore } from '@/store/booking-store'

function generateBookingNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = crypto.randomUUID().slice(0, 4).toUpperCase()
  return `CR-${y}${m}${d}-${rand}`
}

function formatRentalLabel(rentalType: CustomerRentalType) {
  if (rentalType === 'all-in') return 'All In'
  if (rentalType === 'all-out') return 'All Out'
  return 'Self Drive'
}

function formatDocumentLabel(type: string) {
  switch (type) {
    case 'driver_license':
      return "Driver's License"
    case 'valid_id':
      return 'Valid ID'
    case 'proof_of_billing':
      return 'Proof of Billing'
    default:
      return type
  }
}

function isMissingProfileField(value: string | null | undefined, field: 'mobile' | 'default') {
  if (!value) return true

  const trimmedValue = value.trim()
  if (trimmedValue === '') return true

  return field === 'mobile' && trimmedValue === '+63'
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

function getProfileAddress(profile: ReturnType<typeof useProfile>['data']): SelfDriveAddress {
  if (!profile) return emptySelfDriveAddress

  return {
    addressLine1: profile.address_line_1 || '',
    addressLine2: profile.address_line_2 || '',
    streetAddress: profile.street_address || '',
    barangay: profile.barangay || '',
    city: profile.city || '',
    province: profile.province || '',
    zipCode: profile.zip_code || '',
    country: profile.country || 'Philippines',
  }
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

export default function BookingForm() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const rentalType = normalizeCustomerRentalType(searchParams.get('type'))
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''

  const locations = useBookingStore((s) => s.locations)
  const mode = useBookingStore((s) => s.mode)
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
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [tollLoading, setTollLoading] = useState(false)
  const [tollError, setTollError] = useState('')
  const [completeAddress, setCompleteAddress] = useState<SelfDriveAddress>(emptySelfDriveAddress)
  const [completeAddressEdited, setCompleteAddressEdited] = useState(false)

  const vehicleQuery = useVehicleById(vehicleId)
  const profileQuery = useProfile(user?.id)
  const documentsQuery = useCustomerDocuments(user?.id)
  const paymentMethodsQuery = usePaymentMethods()

  const vehicle = vehicleQuery.data ?? null
  const loading = vehicleQuery.isLoading || (!!user && profileQuery.isLoading)
  const selfDriveDocumentsReady = hasRequiredSelfDriveDocuments(documentsQuery.data || [])
  const missingSelfDriveDocuments = getMissingSelfDriveDocuments(documentsQuery.data || [])
  const selfDriveBlocked = rentalType === 'self-drive' && !selfDriveDocumentsReady
  const missingProfileFields = [
    isMissingProfileField(profileQuery.data?.first_name, 'default') && 'First name',
    isMissingProfileField(profileQuery.data?.last_name, 'default') && 'Last name',
    isMissingProfileField(profileQuery.data?.email, 'default') && 'Email address',
    isMissingProfileField(profileQuery.data?.mobile, 'mobile') && 'Mobile number',
  ].filter(Boolean) as string[]
  const profileBlocked = missingProfileFields.length > 0

  useEffect(() => {
    if (rentalType !== 'self-drive' || completeAddressEdited) return
    setCompleteAddress(getProfileAddress(profileQuery.data))
  }, [completeAddressEdited, profileQuery.data, rentalType])

  useEffect(() => {
    if (startParam || endParam) {
      saveBookingDateSelection({ start: startParam, end: endParam })
      return
    }

    const savedSelection = loadBookingDateSelection()
    if (!savedSelection?.start && !savedSelection?.end) return

    const nextParams = new URLSearchParams(searchParams)
    if (savedSelection.start) nextParams.set('start', savedSelection.start)
    if (savedSelection.end) nextParams.set('end', savedSelection.end)
    setSearchParams(nextParams, { replace: true })
  }, [endParam, searchParams, setSearchParams, startParam])

  const userId = user?.id ?? null

  useEffect(() => {
    const needsDistance = mode === 'dropoff' && rentalType !== 'self-drive'
    if (!userId || !vehicleId || (rentalType !== 'all-in' && !needsDistance)) {
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
  }, [
    rentalType,
    locations.dropoff,
    locations.destination,
    locations.pickup,
    mode,
    routeSelections.dropoff,
    routeSelections.destination,
    routeSelections.pickup,
    setRouteQuote,
    setRouteSelection,
    userId,
    vehicleId,
  ])

  useEffect(() => {
    if (rentalType !== 'all-in') {
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
    if (rentalType !== 'all-in' || !routeQuote || !tollSelections.entry || !tollSelections.exit) {
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
  }, [
    rentalType,
    mode,
    routeQuote,
    routeSelections.dropoff,
    routeSelections.destination,
    routeSelections.pickup,
    setRouteQuote,
    setTollRfidBreakdown,
    tollSelections.entry,
    tollSelections.exit,
    tollSelections.vehicleClass,
  ])

  if (!vehicleId || (!loading && !vehicle)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg font-bold text-[#071f52]">Vehicle not found</p>
      </div>
    )
  }

  if (loading) {
    return <BookingFormSkeleton />
  }

  const bookingVehicle = vehicle!
  const startDate = startParam ? new Date(startParam) : null
  const endDate = endParam ? new Date(endParam) : null
  const pricing = getBookingPriceBreakdown({
    rentalType,
    mode,
    startAt: startParam,
    endAt: endParam,
    basePricePerDay: bookingVehicle.base_price_per_day,
    driverRatePerDay: bookingVehicle.driver_rate_per_day,
    routeQuote,
  })
  const requiresPayment = true
  const needsRouteQuote = rentalType === 'all-in' || (mode === 'dropoff' && rentalType !== 'self-drive')
  const basePriceLoading = routeLoading && mode === 'dropoff' && rentalType !== 'self-drive'
  const fuelPriceLoading = routeLoading && rentalType === 'all-in'
  const tollPriceLoading = rentalType === 'all-in' && (routeLoading || tollLoading)
  const tollQuoteReady = !!routeQuote
    && !!tollSelections.entry
    && !!tollSelections.exit
    && routeQuote.tollEntryPlaza === tollSelections.entry.name
    && routeQuote.tollExitPlaza === tollSelections.exit.name
    && routeQuote.tollVehicleClass === tollSelections.vehicleClass
  const needsTollEstimate = rentalType === 'all-in' && !tollQuoteReady
  const selectedPaymentMethod = paymentMethodsQuery.data?.find((method) => method.id === payment.method)

  const selfDriveAddressIncomplete = rentalType === 'self-drive' && !formatSelfDriveAddress(completeAddress)
  const routeIncomplete = needsRouteQuote && (routeSelections.pickup.lat == null || (rentalType === 'all-in' && mode === 'keep' && routeSelections.destination.lat == null) || routeSelections.dropoff.lat == null || !routeQuote)
  const paymentIncomplete = requiresPayment && (!payment.method || !payment.reference.trim() || !receiptFile)
  const isWithDriverDropoff = rentalType !== 'self-drive' && mode === 'dropoff'
  const formIncomplete = !startParam || (!endParam && !isWithDriverDropoff) || profileBlocked || selfDriveBlocked || documentsQuery.isLoading || (requiresPayment && paymentMethodsQuery.isLoading) || selfDriveAddressIncomplete || routeIncomplete || needsTollEstimate || tollLoading || paymentIncomplete

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (!startParam && !endParam) {
      // ponytail: block submit when neither date is set (nothing filled in)
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

    if (profileBlocked) {
      setError('Complete your profile before submitting a booking.')
      return
    }

    if (selfDriveBlocked) {
      setError('Self Drive requires your driver\'s license, valid ID, and proof of billing before submission.')
      return
    }

    const bookingAddress = formatSelfDriveAddress(completeAddress)

    if (rentalType === 'self-drive' && !bookingAddress) {
      setError('Please enter your complete address for this self-drive booking.')
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

    if (requiresPayment && !payment.method) {
      setError('Please select a payment method.')
      return
    }

    if (requiresPayment && !payment.reference.trim()) {
      setError('Please enter your payment reference number.')
      return
    }

    if (requiresPayment && !receiptFile) {
      setError('Please upload your receipt or proof of payment.')
      return
    }

    setSubmitting(true)
    setError('')

    const rentalModel = toBookingRentalModel(rentalType)
    const idempotencyKey = crypto.randomUUID()
    const bookingNotes = notes || null
    const selfDriveAddress = rentalType === 'self-drive' ? completeAddress : null

    const { data: booking, error: bookingError } = await supabase.rpc(
      'create_booking',
      {
        p_booking_number: generateBookingNumber(),
        p_vehicle_id: bookingVehicle.id,
        p_rental_model: rentalModel,
        p_booking_mode: mode,
        p_start_at: startDate?.toISOString() || new Date().toISOString(),
        p_end_at: (mode === 'dropoff' && rentalType !== 'self-drive') ? null : endDate?.toISOString() || null,
        p_duration_days: pricing.days || 1,
        p_pickup_location: locations.pickup || null,
        p_dropoff_location: locations.dropoff || null,
        p_destination: mode === 'keep' ? locations.destination || null : null,
        p_purpose_of_travel: mode === 'keep' ? purpose || null : null,
        p_notes: bookingNotes || null,
        p_idempotency_key: idempotencyKey,
        p_pickup_lat: routeSelections.pickup.lat,
        p_pickup_lng: routeSelections.pickup.lng,
        p_dropoff_lat: routeSelections.dropoff.lat,
        p_dropoff_lng: routeSelections.dropoff.lng,
        p_distance_km: routeQuote?.distanceKm ?? null,
        p_duration_minutes: routeQuote?.durationMinutes ?? null,
        p_fuel_estimate_liters: routeQuote?.fuelEstimateLiters ?? 0,
        p_fuel_estimate_amount: routeQuote?.fuelEstimateAmount ?? 0,
        p_toll_estimate_amount: routeQuote?.tollEstimateAmount ?? 0,
        p_toll_segments: routeQuote?.tollSegments ?? [],
        p_toll_entry_plaza: routeQuote?.tollEntryPlaza ?? null,
        p_toll_entry_expressway: routeQuote?.tollEntryExpressway ?? null,
        p_toll_exit_plaza: routeQuote?.tollExitPlaza ?? null,
        p_toll_exit_expressway: routeQuote?.tollExitExpressway ?? null,
        p_toll_vehicle_class: routeQuote?.tollVehicleClass ?? tollSelections.vehicleClass,
        p_toll_rfid_breakdown: routeQuote?.tollRfidBreakdown ?? [],
        p_self_drive_address: selfDriveAddress,
      },
    )

    if (bookingError) {
      setError(showError(bookingError))
      setSubmitting(false)
      return
    }

    let receiptPath: string | null = null

    if (requiresPayment && receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${booking.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(path, receiptFile)

      if (!uploadError) {
        receiptPath = path
      }
    }

    if (requiresPayment) {
      await supabase.from('payments').insert({
        booking_id: booking.id,
        payment_method_id: payment.method,
        channel: selectedPaymentMethod?.channel || 'bank_transfer',
        status: 'submitted',
        amount: booking.deposit_amount,
        reference_number: payment.reference || null,
        receipt_path: receiptPath,
        submitted_by: user.id,
      })
    }

    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: profileQuery.data?.email || user.email,
          subject: `Booking received: ${booking.booking_number}`,
          text: [
            `Hi ${(profileQuery.data?.first_name || user.user_metadata?.full_name || 'Customer')},`,
            '',
            'Your booking has been received and is now under review.',
            '',
            `Booking Number: ${booking.booking_number}`,
            `Vehicle: ${bookingVehicle.name}`,
            `Rental Type: ${formatRentalLabel(rentalType)}`,
            `Pickup: ${startDate?.toLocaleString() || 'TBD'}`,
            `Drop-off: ${endDate?.toLocaleString() || 'TBD'}`,
            mode === 'dropoff' && rentalType !== 'self-drive'
              ? `Distance: ${pricing.distanceKm || 0} km`
              : `Duration: ${pricing.days || 1} day(s)`,
            `Pickup Location: ${locations.pickup || 'TBD'}`,
            `Drop-off Location: ${locations.dropoff || 'TBD'}`,
            `Destination: ${locations.destination || 'TBD'}`,
            `Total at booking: PHP ${Number(booking.total_amount || 0).toLocaleString()}`,
            `Deposit: PHP ${Number(booking.deposit_amount || 0).toLocaleString()}`,
            `Remaining Balance: PHP ${Number(booking.remaining_amount || 0).toLocaleString()}`,
            rentalType === 'all-in' ? `Fuel estimate (settled after trip): PHP ${Number(routeQuote?.fuelEstimateAmount || 0).toLocaleString()}` : null,
            rentalType === 'all-in' ? `Toll estimate (settled after trip): PHP ${Number(routeQuote?.tollEstimateAmount || 0).toLocaleString()}` : null,
            '',
            'We will contact you once the booking has been reviewed.',
            '',
            'Katada Van Rentals',
          ].filter(Boolean).join('\n'),
        },
      })
    } catch {
      // ponytail: booking success matters more than mail delivery here
    }

    queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] })
    useBookingStore.getState().reset()
    navigate('/bookings')
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
      <button onClick={() => navigate('/our-fleet')} className="mb-4 flex items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
        <ArrowLeft size={16} /> Back to vehicle
      </button>

      <h1 className="text-3xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Book {bookingVehicle.name}</h1>
      <p className="mt-2 text-base font-medium text-[#071f52]/58 sm:text-lg">
        Fill in all details below. Your booking will be reviewed by our team.
      </p>

      {selfDriveBlocked ? (
        <div className="mt-8 rounded-[24px] border border-[#e92935]/24 bg-[#fff5f5] px-5 py-5 text-[#b91c1c] sm:px-6">
          <p className="text-lg font-black">Profile documents required for Self-Drive</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#b91c1c]/88">
            You cannot submit a self-drive booking until the following documents are uploaded to your profile. Please complete them first, then return here to book.
          </p>
          <ul className="mt-4 space-y-2 text-sm font-semibold">
            {missingSelfDriveDocuments.map((documentType) => (
              <li key={documentType}>× {formatDocumentLabel(documentType)} - missing</li>
            ))}
          </ul>
          <Link to="/documents" className="mt-5 inline-flex text-base font-black underline underline-offset-4">
            Complete your documents →
          </Link>
        </div>
        ) : null}

        {profileBlocked ? (
          <div className="mt-8 rounded-[24px] border border-[#e92935]/24 bg-[#fff5f5] px-5 py-5 text-[#b91c1c] sm:px-6">
            <p className="text-lg font-black">Complete your profile before booking</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#b91c1c]/88">
              Your booking uses the contact details from your profile. Update the missing details first, then return here to continue.
            </p>
            <ul className="mt-4 space-y-2 text-sm font-semibold">
              {missingProfileFields.map((field) => (
                <li key={field}>× {field} - missing</li>
              ))}
            </ul>
            <Link to="/profile" className="mt-5 inline-flex text-base font-black underline underline-offset-4">
              Complete your profile →
            </Link>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="card flex items-center gap-4 rounded-[24px] p-4 sm:p-5">
              <img
                src={bookingVehicle.image_paths?.[0] || '/van-1.jpg'}
                alt={bookingVehicle.name}
                className="h-16 w-20 rounded-2xl object-cover"
              />
              <div>
                <p className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">{bookingVehicle.name}</p>
                <p className="mt-1 text-base font-medium text-[#071f52]/52">
                  Toyota · {bookingVehicle.transmission || 'Manual'} · {bookingVehicle.passenger_count} seats
                </p>
              </div>
            </div>

              <BookingSection title="1. RENTAL DETAILS">
                <RentalDetailsFields />
                {rentalType === 'self-drive' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="booking-address-line-1" className="text-sm font-bold text-[#071f52]">Address Line 1 <span className="text-[#e92935]">*</span></label>
                      <input id="booking-address-line-1" required value={completeAddress.addressLine1} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, addressLine1: e.target.value }) }} placeholder="Unit / House No. / Building" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="booking-address-line-2" className="text-sm font-bold text-[#071f52]">Address Line 2</label>
                      <input id="booking-address-line-2" value={completeAddress.addressLine2} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, addressLine2: e.target.value }) }} placeholder="Subdivision / Building Wing / Landmark" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="booking-street-address" className="text-sm font-bold text-[#071f52]">Street Address <span className="text-[#e92935]">*</span></label>
                        <input id="booking-street-address" required value={completeAddress.streetAddress} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, streetAddress: e.target.value }) }} placeholder="Street name" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="booking-barangay" className="text-sm font-bold text-[#071f52]">Barangay <span className="text-[#e92935]">*</span></label>
                        <input id="booking-barangay" required value={completeAddress.barangay} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, barangay: e.target.value }) }} placeholder="Barangay" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="booking-city" className="text-sm font-bold text-[#071f52]">City <span className="text-[#e92935]">*</span></label>
                        <input id="booking-city" required value={completeAddress.city} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, city: e.target.value }) }} placeholder="Pasay City" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="booking-province" className="text-sm font-bold text-[#071f52]">Province <span className="text-[#e92935]">*</span></label>
                        <input id="booking-province" required value={completeAddress.province} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, province: e.target.value }) }} placeholder="Metro Manila" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="booking-zip-code" className="text-sm font-bold text-[#071f52]">ZIP Code <span className="text-[#e92935]">*</span></label>
                        <input id="booking-zip-code" required value={completeAddress.zipCode} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, zipCode: e.target.value }) }} placeholder="1309" className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="booking-country" className="text-sm font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
                        <select id="booking-country" required value={completeAddress.country} onChange={(e) => { setCompleteAddressEdited(true); setCompleteAddress({ ...completeAddress, country: e.target.value }) }} className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60">
                          <option value="Philippines">Philippines</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-[#071f52]/48">Autofilled from your account address. Editing this only affects this booking.</p>
                  </div>
                ) : null}
              </BookingSection>

              <BookingSection title="2. LOCATIONS">
                <LocationsFields />
              </BookingSection>

              <BookingSection title="3. PAYMENT">
                <PaymentFields depositAmount={pricing.deposit} />
              </BookingSection>

            <div className="card">
              <h2 className="mb-4 text-base font-black tracking-[-0.02em] text-[#071f52]">ADDITIONAL NOTES (OPTIONAL)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special requests, notes for the admin, accessibility needs, etc."
                className="block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <div className="pb-8 pt-2 text-center text-sm font-medium text-[#071f52]/48">
              <p>© 2026 Katada Transportation Services. All rights reserved.</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                <Link to="/terms" className="font-bold text-[#071f52] hover:text-[#e92935]">Terms of Service</Link>
                <Link to="/privacy" className="font-bold text-[#071f52] hover:text-[#e92935]">Privacy Policy</Link>
              </div>
              <p className="mt-2">Car Rental Booking System Powered by CarRentSaaS</p>
            </div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <PriceSummary
              rentalType={rentalType}
              bookingMode={mode}
              days={pricing.days}
              basePricePerDay={bookingVehicle.base_price_per_day}
              driverRatePerDay={bookingVehicle.driver_rate_per_day}
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
              disabledMessage={profileBlocked ? 'Complete your profile to enable booking.' : selfDriveBlocked ? 'Complete your profile documents to enable booking.' : (!startParam || !endParam) ? 'Pick-up and drop-off dates are required.' : selfDriveAddressIncomplete ? 'Enter your complete address for this self-drive booking.' : routeLoading ? 'Computing route estimate...' : routeError || (needsRouteQuote && !routeQuote ? 'Pick suggested locations to compute the route estimate.' : tollLoading ? 'Computing toll estimate...' : tollError || (needsTollEstimate ? 'Computing toll estimate...' : paymentIncomplete ? 'Complete payment details to enable booking.' : undefined))}
              error={error}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
