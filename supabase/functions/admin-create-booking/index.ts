import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://katadavanrentals.com'
const SENDER_NAME = Deno.env.get('SENDER_NAME') ?? 'Katada Van Rentals'
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') ?? ''
const DEVELOPER_EMAIL = Deno.env.get('DEVELOPER_EMAIL') ?? ''

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_URLS') ?? '').split(',').map(s => s.trim()).filter(Boolean)

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

function computeDurationDays(startAt: string, endAt: string): number {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

serve(async (req) => {
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

  const { customerMode, existingCustomerId, newCustomer, vehicleId, rentalModel, startAt, endAt, pickupLocation, dropoffLocation, depositAmount } = body as {
    customerMode: string
    existingCustomerId?: string
    newCustomer?: { firstName: string; lastName: string; email: string; mobile?: string; sendInvite: boolean }
    vehicleId: string
    rentalModel: string
    startAt: string
    endAt: string
    pickupLocation?: string
    dropoffLocation?: string
    depositAmount?: number
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
  if (!vehicleId || !rentalModel || !startAt || !endAt) {
    return json(req, { error: 'Vehicle, rental model, start, and end are required' }, 400)
  }
  if (new Date(endAt) <= new Date(startAt)) {
    return json(req, { error: 'End date must be after start date' }, 400)
  }

  let customerId: string

  // Resolve or create customer
  if (customerMode === 'existing') {
    customerId = existingCustomerId!
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', customerId).single()
    if (!existing) {
      return json(req, { error: 'Customer not found' }, 400)
    }
  } else {
    // Create new user
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: newCustomer!.email,
      email_confirm: true,
      user_metadata: {
        first_name: newCustomer!.firstName,
        last_name: newCustomer!.lastName,
        full_name: `${newCustomer!.firstName} ${newCustomer!.lastName}`.trim(),
      },
    })

    if (createUserError) {
      log('ERROR', 'Failed to create user', { error: createUserError.message })
      return json(req, { error: createUserError.message.includes('already registered')
        ? 'A user with this email already exists'
        : 'Failed to create customer account' }, 400)
    }

    customerId = createdUser.user.id

    // Update profile with mobile if provided
    if (newCustomer!.mobile) {
      await supabase.from('profiles').update({ mobile: newCustomer!.mobile }).eq('id', customerId)
    }

    // Send invite email if requested
    if (newCustomer!.sendInvite) {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: newCustomer!.email,
        options: { redirectTo: `${SITE_URL}/login` },
      })

      if (!linkError && linkData?.properties?.action_link) {
        const inviteUrl = linkData.properties.action_link
        const emailHtml = `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
            <h1 style="font-size: 22px; font-weight: 900; color: #071f52; margin: 0 0 8px;">Welcome to ${SENDER_NAME}</h1>
            <p style="font-size: 14px; color: #071f52; opacity: 0.6; margin: 0 0 24px;">Your account has been created by an administrator.</p>
            <p style="font-size: 14px; color: #071f52; margin: 0 0 16px;">Click the button below to set your password and access your account:</p>
            <a href="${inviteUrl}" style="display: inline-block; background: #071f52; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">Set your password</a>
            <p style="font-size: 12px; color: #071f52; opacity: 0.38; margin: 32px 0 0;">If you didn't expect this email, you can safely ignore it.</p>
          </div>`

        await supabase.functions.invoke('send-email', {
          body: {
            to: newCustomer!.email,
            subject: `Set your ${SENDER_NAME} password`,
            html: emailHtml,
          },
        })
      }
    }
  }

  // Check vehicle availability — no overlapping live bookings
  const { data: overlapping } = await supabase
    .from('bookings')
    .select('id, booking_number')
    .eq('vehicle_id', vehicleId)
    .in('status', [...LIVE_BOOKING_STATUSES])
    .lt('start_at', endAt)
    .or(`end_at.is.null,end_at.gt.${startAt}`)

  if (overlapping && overlapping.length > 0) {
    return json(req, {
      error: 'Vehicle is not available for these dates. It has a conflicting booking.',
      conflictBookingNumber: overlapping[0].booking_number,
    }, 409)
  }

  // Insert booking — trigger computes prices
  const durationDays = computeDurationDays(startAt, endAt)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_number: generateBookingNumber(),
      customer_id: customerId,
      vehicle_id: vehicleId,
      rental_model: rentalModel,
      status: 'confirmed',
      start_at: startAt,
      end_at: endAt,
      duration_days: durationDays,
      pickup_location: pickupLocation || null,
      dropoff_location: dropoffLocation || null,
      created_by: user.id,
    })
    .select('id, booking_number, customer_id, total_amount, deposit_amount, remaining_amount, price_line_items')
    .single()

  if (bookingError) {
    log('ERROR', 'Failed to create booking', { error: bookingError.message })
    return json(req, { error: 'Failed to create booking' }, 500)
  }

  // Insert deposit payment if amount > 0
  if (depositAmount && depositAmount > 0) {
    await supabase.from('payments').insert({
      booking_id: booking.id,
      channel: 'cash',
      status: 'verified',
      amount: depositAmount,
      paid_at: new Date().toISOString(),
      submitted_by: user.id,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
  }

  // Send booking confirmation email to customer
  const { data: customerProfile } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', customerId)
    .single()

  if (customerProfile?.email) {
    const confirmHtml = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 22px; font-weight: 900; color: #071f52; margin: 0 0 8px;">Booking Confirmed</h1>
        <p style="font-size: 14px; color: #071f52; opacity: 0.6; margin: 0 0 24px;">Hi ${customerProfile.first_name ?? 'there'}, your booking has been confirmed.</p>
        <div style="background: #f7f9ff; border-radius: 12px; padding: 20px; margin: 0 0 20px;">
          <p style="font-size: 13px; color: #071f52; margin: 0 0 4px;"><strong>Booking #:</strong> ${booking.booking_number}</p>
          <p style="font-size: 13px; color: #071f52; margin: 0 0 4px;"><strong>Dates:</strong> ${new Date(startAt).toLocaleDateString()} — ${new Date(endAt).toLocaleDateString()}</p>
          <p style="font-size: 13px; color: #071f52; margin: 0 0 4px;"><strong>Duration:</strong> ${durationDays} day${durationDays > 1 ? 's' : ''}</p>
          <p style="font-size: 13px; color: #071f52; margin: 0;"><strong>Total:</strong> ₱${booking.total_amount?.toLocaleString()}.00</p>
        </div>
        <p style="font-size: 12px; color: #071f52; opacity: 0.38; margin: 0;">Thank you for choosing ${SENDER_NAME}.</p>
      </div>`

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
