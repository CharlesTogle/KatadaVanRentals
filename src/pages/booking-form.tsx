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
import { UPLOAD_POLICIES } from '@/config/constants'
import { removeUploadedFileWithQueue, uploadFile } from '@/services/upload-service'
import { queryClient } from '@/lib/query'
import { useBookingStore } from '@/store/booking-store'
import { useVatPercent } from '@/hooks/use-vat-percent'
import { logError, getRequestId } from '@/lib/logger'
import { toast } from 'sonner'

function getPersistentIdempotencyKeys(storageKey: string) {
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const keys = JSON.parse(stored) as { booking: string; payment: string }
      if (keys.booking && keys.payment) return keys
    } catch {
      localStorage.removeItem(storageKey)
    }
  }

  const keys = { booking: crypto.randomUUID(), payment: crypto.randomUUID() }
  localStorage.setItem(storageKey, JSON.stringify(keys))
  return keys
}

function generateBookingNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = crypto.randomUUID().slice(0, 4).toUpperCase()
  return `CR-${y}${m}${d}-${rand}`
}

function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderBookingReceivedEmail(input: {
  firstName: string
  bookingNumber: string
  details: Array<[string, string]>
  fuelEstimate?: string
  tollEstimate?: string
}) {
  const name = escapeEmailHtml(input.firstName || 'Customer')
  const rows = [...input.details,
    ...(input.fuelEstimate ? [['Fuel estimate', input.fuelEstimate] as [string, string]] : []),
    ...(input.tollEstimate ? [['Toll estimate', input.tollEstimate] as [string, string]] : []),
  ].map(([label, value]) => `
    <tr>
      <td style="padding:9px 0; border-bottom:1px solid #e5ebf7; color:#52627d; font-size:12px;">${escapeEmailHtml(label)}</td>
      <td style="padding:9px 0; border-bottom:1px solid #e5ebf7; color:#071f52; font-size:12px; font-weight:800; text-align:right;">${escapeEmailHtml(value)}</td>
    </tr>`).join('')

  return `<div style="margin:0; padding:32px 12px; background:#f7f9ff; font-family:Arial,Helvetica,sans-serif; color:#071f52;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">We received your booking ${escapeEmailHtml(input.bookingNumber)}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 32px rgba(7,31,82,0.10);">
    <tr><td style="padding:24px 28px; background:#071f52;">
      <div style="font-size:12px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#ffd923;">Katada Van Rentals</div>
      <div style="margin-top:8px; color:#ffffff; font-size:25px; line-height:1.15; font-weight:900;">Booking received</div>
    </td></tr>
    <tr><td style="padding:30px 28px 12px;">
      <div style="display:inline-block; padding:7px 11px; border-radius:99px; background:#ffd923; color:#071f52; font-size:11px; font-weight:800; letter-spacing:.4px;">UNDER REVIEW</div>
      <h1 style="margin:18px 0 8px; color:#071f52; font-size:23px; line-height:1.2; font-weight:900;">Thanks for booking, ${name}.</h1>
      <p style="margin:0; color:#52627d; font-size:14px; line-height:1.7;">We have your request and our team will review it shortly. Here is a summary of what you submitted.</p>
    </td></tr>
    <tr><td style="padding:16px 28px 28px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:4px 18px; background:#f7f9ff; border:1px solid #e5ebf7; border-radius:14px;">${rows}</table>
      <div style="margin-top:18px; padding:14px 16px; border-left:4px solid #e92935; background:#fff4f4; color:#071f52; font-size:12px; line-height:1.6;"><strong>Next step:</strong> We will contact you once the booking has been reviewed.</div>
    </td></tr>
    <tr><td style="padding:18px 28px; background:#fff8d9; color:#071f52; font-size:11px; line-height:1.6;">Please keep your booking number <strong>${escapeEmailHtml(input.bookingNumber)}</strong> for reference.</td></tr>
  </table>
</div>`
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

export default function BookingForm() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const vatPercent = useVatPercent()

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
  const idempotencyStorageKey = `katada:booking:${user?.id || 'guest'}:${vehicleId || ''}:${startParam}:${endParam}:${rentalType}:${mode}`
  const [idempotencyKeys] = useState(() => getPersistentIdempotencyKeys(idempotencyStorageKey))

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
    if (startParam || endParam) {
      const savedSelection = loadBookingDateSelection()
      const sameSelection = savedSelection?.start === startParam && savedSelection.end === endParam
      saveBookingDateSelection({
        start: startParam,
        end: endParam,
        availableVehicleIds: sameSelection ? savedSelection?.availableVehicleIds : [],
      })
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
    if (!userId || !vehicleId) {
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
        }).catch((error) => {
          logError('booking', 'Automatic location resolution failed', error, { requestId: getRequestId() })
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
      inServiceArea: routeQuote?.inServiceArea,
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
      inServiceArea: routeQuote?.inServiceArea,
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
    distanceRatePerKm: bookingVehicle.peso_per_km,
    driverRatePerDay: bookingVehicle.driver_rate_per_day,
    carWashFee: bookingVehicle.car_wash_fee,
    deliveryFee: bookingVehicle.delivery_fee,
    securityDeposit: bookingVehicle.security_deposit,
    securityDepositType: bookingVehicle.security_deposit_type,
    excessRatePerHour: bookingVehicle.excess_rate_per_hour,
    autoFullDayAfterHours: bookingVehicle.auto_full_day_after_hours,
    twelveHourRate: bookingVehicle.twelve_hour_rate,
    routeQuote,
  })
  const requiresPayment = routeQuote?.inServiceArea !== false
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
  const selectedPaymentMethod = paymentMethodsQuery.data?.find((method) => method.id === payment.method)

  const routeIncomplete = needsRouteQuote && (routeSelections.pickup.lat == null || (rentalType === 'all-in' && mode === 'keep' && routeSelections.destination.lat == null) || routeSelections.dropoff.lat == null || !routeQuote)
  const paymentIncomplete = requiresPayment && (!payment.method || !payment.reference.trim() || !receiptFile)
  const isWithDriverDropoff = rentalType !== 'self-drive' && mode === 'dropoff'
  const formIncomplete = !startParam || (!endParam && !isWithDriverDropoff) || profileBlocked || selfDriveBlocked || documentsQuery.isLoading || (requiresPayment && paymentMethodsQuery.isLoading) || routeIncomplete || needsTollEstimate || tollLoading || paymentIncomplete

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
    const idempotencyKey = idempotencyKeys.booking
    const paymentIdempotencyKey = idempotencyKeys.payment
    const bookingNotes = notes || null
    let receiptPath: string | null = null
    if (requiresPayment && receiptFile) {
      receiptPath = `${user.id}/${paymentIdempotencyKey}`
      try {
        await uploadFile({ bucket: 'payment-receipts', file: receiptFile, path: receiptPath, policy: UPLOAD_POLICIES.paymentReceipts, upsert: true })
      } catch (error) {
        logError('booking', 'Payment receipt upload failed', error, { requestId: getRequestId() })
        setError('Receipt upload failed. Please try again.')
        setSubmitting(false)
        return
      }
    }

    const { data: booking, error: bookingError } = await supabase.rpc(
      'create_booking_with_payment',
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
        p_in_service_area: routeQuote?.inServiceArea ?? true,
        p_flagged_for_manual_pricing: routeQuote?.inServiceArea === false,
        p_payment_method_id: requiresPayment ? payment.method : null,
        p_payment_channel: selectedPaymentMethod?.channel || 'bank_transfer',
        p_payment_reference: requiresPayment ? payment.reference.trim() : null,
        p_payment_receipt_path: receiptPath,
        p_payment_idempotency_key: paymentIdempotencyKey,
      },
    )

    if (bookingError) {
      if (receiptPath) await removeUploadedFileWithQueue('payment-receipts', receiptPath).catch((cleanupError) => {
        logError('booking', 'Failed to remove payment receipt after booking failure', cleanupError)
      })
      setError(showError(bookingError))
      setSubmitting(false)
      return
    }

    let emailDeliveryFailed = false
    try {
      const customerName = profileQuery.data?.first_name || user.user_metadata?.full_name || 'Customer'
      await supabase.functions.invoke('send-email', {
        body: {
          to: profileQuery.data?.email || user.email,
          subject: `Booking received: ${booking.booking_number}`,
          html: renderBookingReceivedEmail({
            firstName: customerName,
            bookingNumber: booking.booking_number,
            details: [
              ['Vehicle', bookingVehicle.name],
              ['Rental type', formatRentalLabel(rentalType)],
              ['Pickup', startDate?.toLocaleString() || 'TBD'],
              ['Drop-off', endDate?.toLocaleString() || 'TBD'],
              [
                mode === 'dropoff' && rentalType !== 'self-drive' ? 'Distance' : 'Duration',
                mode === 'dropoff' && rentalType !== 'self-drive' ? `${pricing.distanceKm || 0} km` : `${pricing.days || 1} day(s)`,
              ],
              ['Pickup location', locations.pickup || 'TBD'],
              ['Drop-off location', locations.dropoff || 'TBD'],
              ['Destination', locations.destination || 'TBD'],
              ['Total at booking', `PHP ${Number(booking.total_amount || 0).toLocaleString()}`],
              ['Deposit', `PHP ${Number(booking.deposit_amount || 0).toLocaleString()}`],
              ['Remaining balance', `PHP ${Number(booking.remaining_amount || 0).toLocaleString()}`],
            ],
            fuelEstimate: rentalType === 'all-in' ? `PHP ${Number(routeQuote?.fuelEstimateAmount || 0).toLocaleString()}` : undefined,
            tollEstimate: rentalType === 'all-in' ? `PHP ${Number(routeQuote?.tollEstimateAmount || 0).toLocaleString()}` : undefined,
          }),
        },
      })
    } catch (error) {
      emailDeliveryFailed = true
      logError('booking', 'Confirmation email failed', error, { requestId: getRequestId() })
    }

    localStorage.removeItem(idempotencyStorageKey)
    queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] })
    useBookingStore.getState().reset()
    if (emailDeliveryFailed) toast.warning('Booking received; confirmation email could not be sent.')
    navigate('/bookings')
  }

  return (
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <button onClick={() => navigate('/our-fleet')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#071f52]/60 transition-colors hover:text-[#e92935] sm:mb-4 sm:gap-2 sm:text-sm">
        <ArrowLeft size={14} className="sm:hidden" />
        <ArrowLeft size={16} className="hidden sm:block" />
        Back to vehicle
      </button>

      <h1 className="text-lg font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl sm:tracking-[-0.04em]">Book {bookingVehicle.name}</h1>
      <p className="mt-1 text-xs font-medium text-[#071f52]/58 sm:mt-2 sm:text-base sm:text-lg">
        Fill in all details below. Your booking will be reviewed by our team.
      </p>

      {selfDriveBlocked ? (
        <div className="mt-6 rounded-lg border border-[#e92935]/24 bg-[#fff5f5] px-4 py-4 text-[#b91c1c] sm:mt-8 sm:rounded-[24px] sm:px-6 sm:py-5">
          <p className="text-sm font-black sm:text-lg">Profile documents required for Self-Drive</p>
          <p className="mt-1.5 text-xs font-medium leading-5 text-[#b91c1c]/88 sm:mt-2 sm:text-sm sm:leading-6">
            You cannot submit a self-drive booking until the following documents are uploaded to your profile. Please complete them first, then return here to book.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs font-semibold sm:mt-4 sm:space-y-2 sm:text-sm">
            {missingSelfDriveDocuments.map((documentType) => (
              <li key={documentType}>× {formatDocumentLabel(documentType)} - missing</li>
            ))}
          </ul>
          <Link to="/documents" className="mt-4 inline-flex text-sm font-black underline underline-offset-4 sm:mt-5 sm:text-base">
            Complete your documents →
          </Link>
        </div>
        ) : null}

        {profileBlocked ? (
          <div className="mt-6 rounded-lg border border-[#e92935]/24 bg-[#fff5f5] px-4 py-4 text-[#b91c1c] sm:mt-8 sm:rounded-[24px] sm:px-6 sm:py-5">
            <p className="text-sm font-black sm:text-lg">Complete your profile before booking</p>
            <p className="mt-1.5 text-xs font-medium leading-5 text-[#b91c1c]/88 sm:mt-2 sm:text-sm sm:leading-6">
              Your booking uses the contact details from your profile. Update the missing details first, then return here to continue.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs font-semibold sm:mt-4 sm:space-y-2 sm:text-sm">
              {missingProfileFields.map((field) => (
                <li key={field}>× {field} - missing</li>
              ))}
            </ul>
            <Link to="/profile" className="mt-4 inline-flex text-sm font-black underline underline-offset-4 sm:mt-5 sm:text-base">
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
                  <RentalDetailsFields vehicle={bookingVehicle} />
              </BookingSection>

              <BookingSection title="2. LOCATIONS">
                <LocationsFields />
              </BookingSection>

              <BookingSection title="3. PAYMENT">
                {routeQuote?.inServiceArea === false ? (
                  <div className="rounded-xl border border-[#f59e0b]/10 bg-[#f59e0b]/4 px-4 py-3">
                    <p className="text-sm font-semibold text-[#92400e]">Payment Skipped</p>
                    <p className="mt-1 text-xs font-medium text-[#92400e]/80">
                      This booking requires manual pricing. No downpayment is needed right now — we'll reach out once pricing is set.
                    </p>
                  </div>
                ) : (
                  <PaymentFields depositAmount={pricing.deposit} />
                )}
              </BookingSection>

            <div className="card">
              <h2 className="mb-4 text-base font-black tracking-[-0.02em] text-[#071f52] sm:text-lg">ADDITIONAL NOTES (OPTIONAL)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special requests, notes for the admin, accessibility needs, etc."
                className="block w-full resize-none rounded-lg border border-[#071f52]/14 bg-[#f7f9ff] px-3 py-2 text-xs font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base"
              />
            </div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <PriceSummary
              rentalType={rentalType}
              bookingMode={mode}
              days={pricing.days}
              basePricePerDay={bookingVehicle.base_price_per_day}
              distanceRatePerKm={bookingVehicle.peso_per_km}
              driverRatePerDay={bookingVehicle.driver_rate_per_day}
              carWashFee={pricing.carWash}
              deliveryFee={pricing.delivery}
              securityDeposit={pricing.securityDeposit}
              securityDepositType={bookingVehicle.security_deposit_type}
              securityDepositValue={bookingVehicle.security_deposit}
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
              flaggedForManualPricing={routeQuote?.inServiceArea === false}
               disabledMessage={profileBlocked ? 'Complete your profile to enable booking.' : selfDriveBlocked ? 'Complete your profile documents to enable booking.' : (!startParam || !endParam) ? 'Pick-up and drop-off dates are required.' : routeLoading ? 'Computing route estimate...' : routeError || (needsRouteQuote && !routeQuote ? 'Pick suggested locations to compute the route estimate.' : tollLoading ? 'Computing toll estimate...' : tollError || (needsTollEstimate ? 'Computing toll estimate...' : paymentIncomplete ? 'Complete payment details to enable booking.' : undefined))}
              error={error}
            />
          </div>
        </div>

        <div className="mt-6 text-center text-xs font-medium text-[#071f52]/48 sm:text-sm">
          <p>© 2026 Katada Transportation Services. All rights reserved.</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 sm:mt-2 sm:gap-4">
            <Link to="/terms" className="font-bold text-[#071f52] hover:text-[#e92935]">Terms of Service</Link>
            <Link to="/privacy" className="font-bold text-[#071f52] hover:text-[#e92935]">Privacy Policy</Link>
          </div>
        </div>
      </form>
    </div>
  )
}
