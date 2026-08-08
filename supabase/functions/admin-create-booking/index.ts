import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderBookingConfirmedEmail } from '../_shared/booking-confirmed-email.ts'
import { escapeHtml, renderEmailLayout } from '../_shared/email-layout.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://katadavanrentals.com'
const SENDER_NAME = Deno.env.get('SENDER_NAME') ?? 'Katada Van Rentals'
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') ?? ''
const DEVELOPER_EMAIL = Deno.env.get('DEVELOPER_EMAIL') ?? ''

const ALLOWED_URLS = Deno.env.get('ALLOWED_URLS')?.trim() ?? ''
const ALLOWED_ORIGINS = ALLOWED_URLS.split(',').map(s => s.trim()).filter(Boolean)

const LIVE_BOOKING_STATUSES = ['for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip'] as const

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.length === 0 || !ALLOWED_ORIGINS.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function log(level: string, message: string, extra?: Record<string, unknown>) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'admin-create-booking',
    message,
    ...extra,
  }))
}

function generateBookingNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CR-${date}-${rand}`
}

function computeDurationDays(startAt: string, endAt?: string | null): number {
  if (!endAt) return 1
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

serve(async (req) => {
  if (!ALLOWED_URLS) {
    log('ERROR', 'ALLOWED_URLS is not configured')
    return json(req, { error: 'ALLOWED_URLS is not configured' }, 500)
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Authenticate caller via JWT
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return json(req, { error: 'Missing authorization' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return json(req, { error: 'Unauthorized' }, 401)
  }

  // Verify caller is admin/manager/staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager', 'staff'].includes(profile.role)) {
    return json(req, { error: 'Not authorized' }, 403)
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Invalid request body' }, 400)
  }

  const { customerMode, existingCustomerId, newCustomer, vehicleId, rentalModel, bookingMode, startAt, endAt, pickupLocation, dropoffLocation, destination, purposeOfTravel, notes, pickupLat, pickupLng, dropoffLat, dropoffLng, distanceKm, durationMinutes, fuelEstimateLiters, fuelEstimateAmount, tollEstimateAmount, tollSegments, tollEntryPlaza, tollEntryExpressway, tollExitPlaza, tollExitExpressway, tollVehicleClass, tollRfidBreakdown, selfDriveAddress, inServiceArea, flaggedForManualPricing, bookingIdempotencyKey, paymentIdempotencyKey, paymentMethodId, paymentReference, paymentReceiptPath, paymentChannel } = body as {
    customerMode: string
    existingCustomerId?: string
    newCustomer?: { firstName: string; lastName: string; email: string; mobile?: string; sendInvite: boolean }
    vehicleId: string
    rentalModel: string
    bookingMode?: 'dropoff' | 'keep'
    startAt: string
    endAt?: string
    pickupLocation?: string
    dropoffLocation?: string
    destination?: string
    purposeOfTravel?: string
    notes?: string
    pickupLat?: number
    pickupLng?: number
    dropoffLat?: number
    dropoffLng?: number
    distanceKm?: number
    durationMinutes?: number
    fuelEstimateLiters?: number
    fuelEstimateAmount?: number
    tollEstimateAmount?: number
    tollSegments?: unknown[]
    tollEntryPlaza?: string
    tollEntryExpressway?: string
    tollExitPlaza?: string
    tollExitExpressway?: string
    tollVehicleClass?: 1 | 2 | 3
    tollRfidBreakdown?: Record<string, unknown>[]
    selfDriveAddress?: Record<string, unknown>
    inServiceArea?: boolean
    flaggedForManualPricing?: boolean
    bookingIdempotencyKey: string
    paymentIdempotencyKey: string
    paymentMethodId?: string | null
    paymentReference?: string | null
    paymentReceiptPath?: string | null
    paymentChannel?: string
  }

  // Validate
  if (!customerMode || !['existing', 'new'].includes(customerMode)) {
    return json(req, { error: 'Invalid customer mode' }, 400)
  }
  if (customerMode === 'existing' && !existingCustomerId) {
    return json(req, { error: 'Existing customer ID required' }, 400)
  }
  if (customerMode === 'new' && (!newCustomer?.firstName || !newCustomer?.lastName || !newCustomer?.email)) {
    return json(req, { error: 'New customer requires first name, last name, and email' }, 400)
  }
  if (!vehicleId || !rentalModel || !startAt) {
    return json(req, { error: 'Vehicle, rental model, and start are required' }, 400)
  }
  if (!['self_drive', 'all_out', 'all_in'].includes(rentalModel)) {
    return json(req, { error: 'Invalid rental model' }, 400)
  }
  if (!bookingIdempotencyKey || !paymentIdempotencyKey) {
    return json(req, { error: 'Booking and payment idempotency keys are required' }, 400)
  }
  if (!bookingMode || !['dropoff', 'keep'].includes(bookingMode)) {
    return json(req, { error: 'Invalid booking mode' }, 400)
  }

  const isSelfDrive = rentalModel === 'self_drive'
  const isAllIn = rentalModel === 'all_in'
  const usesRoutePricing = isAllIn || (rentalModel === 'all_out' && bookingMode === 'dropoff')
  const normalizedEndAt = isSelfDrive || bookingMode === 'keep' ? endAt ?? null : null
  const normalizedDestination = isSelfDrive || bookingMode === 'keep' ? destination ?? null : null
  const normalizedPurposeOfTravel = isSelfDrive || bookingMode === 'keep' ? purposeOfTravel ?? null : null
  const normalizedDistanceKm = usesRoutePricing ? distanceKm ?? null : null
  const normalizedDurationMinutes = usesRoutePricing ? durationMinutes ?? null : null
  const normalizedFuelEstimateLiters = isAllIn ? fuelEstimateLiters ?? 0 : 0
  const normalizedFuelEstimateAmount = isAllIn ? fuelEstimateAmount ?? 0 : 0
  const normalizedTollEstimateAmount = isAllIn ? tollEstimateAmount ?? 0 : 0
  const normalizedTollSegments = isAllIn ? tollSegments ?? [] : []
  const normalizedTollEntryPlaza = isAllIn ? tollEntryPlaza ?? null : null
  const normalizedTollEntryExpressway = isAllIn ? tollEntryExpressway ?? null : null
  const normalizedTollExitPlaza = isAllIn ? tollExitPlaza ?? null : null
  const normalizedTollExitExpressway = isAllIn ? tollExitExpressway ?? null : null
  const normalizedTollVehicleClass = isAllIn ? tollVehicleClass ?? 1 : 1
  const normalizedTollRfidBreakdown = isAllIn ? tollRfidBreakdown ?? [] : []
  const normalizedSelfDriveAddress = isSelfDrive ? selfDriveAddress ?? null : null

  if ((isSelfDrive || bookingMode === 'keep') && !normalizedEndAt) {
    return json(req, { error: 'End date is required for this booking' }, 400)
  }
  if (normalizedEndAt && new Date(normalizedEndAt) <= new Date(startAt)) {
    return json(req, { error: 'End date must be after start date' }, 400)
  }

  // Check availability before creating a customer account.
  const overlapEndAt = normalizedEndAt ?? new Date(new Date(startAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
  const { data: overlapping } = await supabase
    .from('bookings')
    .select('id, booking_number')
    .eq('vehicle_id', vehicleId)
    .in('status', [...LIVE_BOOKING_STATUSES])
    .lt('start_at', overlapEndAt)
    .or(`end_at.is.null,end_at.gt.${startAt}`)

  if (overlapping && overlapping.length > 0) {
    return json(req, {
      error: 'Vehicle is not available for these dates. It has a conflicting booking.',
      conflictBookingNumber: overlapping[0].booking_number,
    }, 409)
  }

  let customerId: string | null = null
  let newlyCreatedCustomerId: string | null = null

  // Resolve or create customer
  if (customerMode === 'existing') {
    customerId = existingCustomerId!
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', customerId).single()
    if (!existing) {
      return json(req, { error: 'Customer not found' }, 400)
    }
  }

  if (customerMode === 'new') {
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', newCustomer!.email).maybeSingle()
    if (existingProfile) {
      customerId = existingProfile.id
    } else {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: newCustomer!.email,
        email_confirm: true,
        user_metadata: { first_name: newCustomer!.firstName, last_name: newCustomer!.lastName, full_name: `${newCustomer!.firstName} ${newCustomer!.lastName}`.trim() },
      })
      if (createUserError) return json(req, { error: 'Failed to create customer account' }, 500)
      customerId = createdUser.user.id
      newlyCreatedCustomerId = customerId
      if (newCustomer!.mobile) await supabase.from('profiles').update({ mobile: newCustomer!.mobile }).eq('id', customerId)
    }
  }

  // Insert booking and its mandatory payment in one database transaction.
  const durationDays = computeDurationDays(startAt, normalizedEndAt)
  const { data: booking, error: bookingError } = await supabase.rpc('admin_create_booking_with_payment', {
    p_customer_id: customerId,
    p_actor_id: user.id,
    p_booking: {
      booking_number: generateBookingNumber(),
      guest_name: customerMode === 'new' ? `${newCustomer!.firstName} ${newCustomer!.lastName}`.trim() : null,
      guest_email: customerMode === 'new' ? newCustomer!.email : null,
      guest_mobile: customerMode === 'new' ? newCustomer!.mobile || null : null,
      vehicle_id: vehicleId,
      rental_model: rentalModel,
      booking_mode: bookingMode,
      status: 'confirmed',
      start_at: startAt,
      end_at: normalizedEndAt,
      duration_days: durationDays,
      pickup_location: pickupLocation || null,
      pickup_lat: pickupLat ?? null,
      pickup_lng: pickupLng ?? null,
      dropoff_location: dropoffLocation || null,
      dropoff_lat: dropoffLat ?? null,
      dropoff_lng: dropoffLng ?? null,
      destination: normalizedDestination,
      purpose_of_travel: normalizedPurposeOfTravel,
      notes: notes || null,
      distance_km: normalizedDistanceKm,
      duration_minutes: normalizedDurationMinutes,
      fuel_estimate_liters: normalizedFuelEstimateLiters,
      fuel_estimate_amount: normalizedFuelEstimateAmount,
      toll_estimate_amount: normalizedTollEstimateAmount,
      toll_segments: normalizedTollSegments,
      toll_entry_plaza: normalizedTollEntryPlaza,
      toll_entry_expressway: normalizedTollEntryExpressway,
      toll_exit_plaza: normalizedTollExitPlaza,
      toll_exit_expressway: normalizedTollExitExpressway,
      toll_vehicle_class: normalizedTollVehicleClass,
      toll_rfid_breakdown: normalizedTollRfidBreakdown,
      self_drive_address: normalizedSelfDriveAddress,
      in_service_area: inServiceArea ?? true,
      flagged_for_manual_pricing: flaggedForManualPricing ?? false,
      created_by: user.id,
      idempotency_key: bookingIdempotencyKey,
    },
    p_payment: {
      idempotency_key: paymentIdempotencyKey,
      payment_method_id: paymentMethodId ?? null,
      channel: paymentChannel ?? 'cash',
      reference_number: paymentReference ?? null,
      receipt_path: paymentReceiptPath ?? null,
    },
  })

  if (bookingError) {
    if (newlyCreatedCustomerId) await supabase.auth.admin.deleteUser(newlyCreatedCustomerId)
    log('ERROR', 'Failed to create booking', { error: bookingError.message })
    return json(req, { error: 'Failed to create booking' }, 500)
  }

  if (newCustomer?.sendInvite && customerId) {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: newCustomer!.email,
      options: { redirectTo: `${SITE_URL}/password/reset?source=admin-create-booking` },
    })

    if (!linkError && linkData?.properties?.action_link) {
      const inviteUrl = linkData.properties.action_link
      await supabase.functions.invoke('send-email', {
        body: {
          to: newCustomer!.email,
          subject: `Set your ${SENDER_NAME} password`,
          html: renderEmailLayout({
            preheader: `Set your ${SENDER_NAME} password to access your account.`,
            label: 'Account setup',
            title: `Welcome to ${escapeHtml(SENDER_NAME)}.`,
            intro: 'Your account is ready. Set a password to sign in and manage your van rental.',
            content: `<a href="${escapeHtml(inviteUrl)}" style="display:inline-block; padding:14px 22px; background:#e92935; color:#ffffff; text-decoration:none; font-size:13px; font-weight:800; letter-spacing:.4px;">Set your password&nbsp; →</a>`,
            footer: 'This link is for your account only. If you were not expecting this message, you can ignore it.',
          }),
        },
      })
    }
  }

  // Send booking confirmation email to customer
  const { data: customerProfile } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', customerId)
    .single()

  if (customerProfile?.email) {
    const confirmHtml = renderBookingConfirmedEmail({
      firstName: customerProfile.first_name ?? 'there',
      bookingNumber: booking.booking_number,
      dates: `${new Date(startAt).toLocaleDateString()}${normalizedEndAt ? ` — ${new Date(normalizedEndAt).toLocaleDateString()}` : ''}`,
      duration: `${durationDays} day${durationDays > 1 ? 's' : ''}`,
      total: `₱${booking.total_amount?.toLocaleString()}.00`,
    })

    await supabase.functions.invoke('send-email', {
      body: {
        to: customerProfile.email,
        subject: `Booking Confirmed — ${booking.booking_number}`,
        html: confirmHtml,
      },
    })
  }

  log('INFO', 'Booking created', { bookingId: booking.id, bookingNumber: booking.booking_number, customerId })

  return json(req, {
    bookingId: booking.id,
    bookingNumber: booking.booking_number,
    customerId,
    status: 'confirmed',
  })
})
