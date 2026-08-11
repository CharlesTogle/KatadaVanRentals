import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderBookingConfirmedEmail } from '../_shared/booking-confirmed-email.ts'
import { escapeHtml, renderEmailLayout } from '../_shared/email-layout.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://katadavanrentals.com'
const LOGO_URL = `${SITE_URL.replace(/\/$/, '')}/logo.jpg`
const SENDER_NAME = Deno.env.get('SENDER_NAME') ?? 'Katada Van Rentals'

const ALLOWED_URLS = Deno.env.get('ALLOWED_URLS')?.trim() ?? ''
const ALLOWED_ORIGINS = ALLOWED_URLS.split(',').map(s => s.trim()).filter(Boolean)

const LIVE_BOOKING_STATUSES = ['for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip'] as const
const requestIds = new WeakMap<Request, string>()

function normalizeMobile(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('63')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return `+63${digits.slice(0, 10)}`
}

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
  const requestId = requestIdFor(req)
  const responseBody = status >= 400 && body && typeof body === 'object' ? { ...body, requestId } : body
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'X-Request-ID': requestId },
  })
}

function requestIdFor(req: Request) {
  const existing = requestIds.get(req)
  if (existing) return existing
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()
  requestIds.set(req, requestId)
  return requestId
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

async function deleteCreatedCustomer(
  supabase: { auth: { admin: { deleteUser: (id: string) => Promise<{ error: { message: string } | null }> } } },
  customerId: string,
  requestId: string,
) {
  const { error } = await supabase.auth.admin.deleteUser(customerId)
  if (error) log('ERROR', 'Failed to roll back customer creation', { requestId, customerId, errorCode: 'ROLLBACK_FAILED' })
}

serve(async (req) => {
  const requestId = requestIdFor(req)
  if (!ALLOWED_URLS) {
    log('ERROR', 'ALLOWED_URLS is not configured')
    return json(req, { errorCode: 'CONFIGURATION_ERROR' }, 500)
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json(req, { errorCode: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Authenticate caller via JWT
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return json(req, { errorCode: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return json(req, { errorCode: 'UNAUTHORIZED' }, 401)
  }

  // Verify caller is admin/manager/staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager', 'staff'].includes(profile.role)) {
    return json(req, { errorCode: 'FORBIDDEN' }, 403)
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
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
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (customerMode === 'existing' && !existingCustomerId) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (customerMode === 'new' && (!newCustomer?.firstName || !newCustomer?.lastName || !newCustomer?.email)) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (!vehicleId || !rentalModel || !startAt) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (!['self_drive', 'all_out', 'all_in'].includes(rentalModel)) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (!bookingIdempotencyKey || !paymentIdempotencyKey) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (!bookingMode || !['dropoff', 'keep'].includes(bookingMode)) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
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
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }
  if (normalizedEndAt && new Date(normalizedEndAt) <= new Date(startAt)) {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, is_available')
    .eq('id', vehicleId)
    .maybeSingle()

  if (vehicleError) {
    log('ERROR', 'Availability check failed', { requestId, errorCode: vehicleError.code ?? 'AVAILABILITY_CHECK_FAILED' })
    return json(req, { errorCode: 'AVAILABILITY_CHECK_FAILED' }, 500)
  }

  if (!vehicle?.is_available) {
    return json(req, { errorCode: 'VEHICLE_UNAVAILABLE' }, 409)
  }

  const { data: activeBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('start_at, end_at, booking_number')
    .eq('vehicle_id', vehicleId)
    .in('status', [...LIVE_BOOKING_STATUSES])

  if (bookingsError) {
    log('ERROR', 'Availability check failed', { requestId, errorCode: bookingsError.code ?? 'AVAILABILITY_CHECK_FAILED' })
    return json(req, { errorCode: 'AVAILABILITY_CHECK_FAILED' }, 500)
  }

  const requestedStart = new Date(startAt).getTime()
  const requestedEnd = normalizedEndAt ? new Date(normalizedEndAt).getTime() : requestedStart
  const overlapping = activeBookings?.find((booking) => {
    const bookingStart = new Date(booking.start_at).getTime()
    const bookingEnd = booking.end_at ? new Date(booking.end_at).getTime() : bookingStart

    return normalizedEndAt
      ? booking.end_at
        ? bookingStart < requestedEnd && bookingEnd > requestedStart
        : bookingStart >= requestedStart && bookingStart < requestedEnd
      : booking.end_at
        ? bookingStart <= requestedStart && bookingEnd > requestedStart
        : bookingStart === requestedStart
  })

  if (overlapping) {
    return json(req, {
      errorCode: 'VEHICLE_UNAVAILABLE',
      ...(overlapping.booking_number ? { conflictBookingNumber: overlapping.booking_number } : {}),
    }, 409)
  }

  let customerId: string | null = null
  let newlyCreatedCustomerId: string | null = null

  // Resolve or create customer
  if (customerMode === 'existing') {
    customerId = existingCustomerId!
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', customerId).single()
    if (!existing) {
      return json(req, { errorCode: 'CUSTOMER_NOT_FOUND' }, 400)
    }
  }

  const normalizedNewCustomerMobile = customerMode === 'new' && newCustomer!.mobile
    ? normalizeMobile(newCustomer!.mobile)
    : ''

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
      if (createUserError || !createdUser?.user?.id) {
        if (createdUser?.user?.id) await deleteCreatedCustomer(supabase, createdUser.user.id, requestId)
        return json(req, { errorCode: 'CUSTOMER_CREATE_FAILED' }, 500)
      }
      customerId = createdUser.user.id
      newlyCreatedCustomerId = customerId
      if (normalizedNewCustomerMobile) {
        const { error: profileUpdateError } = await supabase.from('profiles').update({ mobile: normalizedNewCustomerMobile }).eq('id', customerId)
        if (profileUpdateError) {
          await deleteCreatedCustomer(supabase, customerId, requestId)
          return json(req, { errorCode: 'CUSTOMER_CREATE_FAILED' }, 500)
        }
      }
    }
  }

  // Insert booking and its mandatory payment in one database transaction.
  const durationDays = computeDurationDays(startAt, normalizedEndAt)
  log('INFO', 'Calling admin booking RPC', {
    requestId,
    customerId,
    actorId: user.id,
    vehicleId,
    bookingIdempotencyKey,
    paymentIdempotencyKey,
    flaggedForManualPricing: flaggedForManualPricing ?? false,
  })
  let booking: typeof import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient extends never ? never : Record<string, unknown> | null
  let bookingError: { code?: string; message: string; details?: string; hint?: string } | null
  try {
    const result = await supabase.rpc('admin_create_booking_with_payment', {
      p_customer_id: customerId,
      p_actor_id: user.id,
      p_booking: {
        booking_number: generateBookingNumber(),
        guest_name: customerMode === 'new' ? `${newCustomer!.firstName} ${newCustomer!.lastName}`.trim() : null,
        guest_email: customerMode === 'new' ? newCustomer!.email : null,
        guest_mobile: customerMode === 'new' ? normalizedNewCustomerMobile || null : null,
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
    booking = result.data as Record<string, unknown> | null
    bookingError = result.error
  } catch (error) {
    const thrownError = error instanceof Error ? error : new Error(String(error))
    log('ERROR', 'Admin booking RPC threw', {
      requestId,
      errorName: thrownError.name,
      errorMessage: thrownError.message,
      errorStack: thrownError.stack,
      rpc: 'admin_create_booking_with_payment',
      bookingIdempotencyKey,
      paymentIdempotencyKey,
    })
    return json(req, { errorCode: 'BOOKING_CREATE_FAILED' }, 500)
  }

  if (bookingError) {
    if (newlyCreatedCustomerId) await deleteCreatedCustomer(supabase, newlyCreatedCustomerId, requestId)
    log('ERROR', 'Failed to create booking', {
      requestId,
      errorCode: bookingError.code ?? 'BOOKING_CREATE_FAILED',
      errorMessage: bookingError.message,
      errorDetails: bookingError.details,
      errorHint: bookingError.hint,
      rpc: 'admin_create_booking_with_payment',
      bookingIdempotencyKey,
      paymentIdempotencyKey,
    })
    return json(req, { errorCode: 'BOOKING_CREATE_FAILED' }, 500)
  }

  log('INFO', 'Admin booking RPC completed', {
    requestId,
    bookingId: booking?.id,
    bookingNumber: booking?.booking_number,
    customerId,
    paymentIdempotencyKey,
  })

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
            logoUrl: LOGO_URL,
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
    const confirmationEmail = renderBookingConfirmedEmail({
      logoUrl: LOGO_URL,
      firstName: customerProfile.first_name ?? 'there',
      bookingNumber: booking.booking_number,
      dates: `${new Date(startAt).toLocaleDateString()}${normalizedEndAt ? ` — ${new Date(normalizedEndAt).toLocaleDateString()}` : ''}`,
      duration: `${durationDays} day${durationDays > 1 ? 's' : ''}`,
      total: `₱${booking.total_amount?.toLocaleString()}.00`,
    })

    await supabase.functions.invoke('send-email', {
      body: {
        to: customerProfile.email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
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
