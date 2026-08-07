import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { renderBookingCanceledEmail } from '../_shared/booking-canceled-email.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DEVELOPER_EMAIL = Deno.env.get('DEVELOPER_EMAIL')!
const SENDER_NAME = Deno.env.get('SENDER_NAME') ?? 'Katada Van Rentals'
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL')!

const RATE_LIMIT = 10
const RATE_WINDOW = 60_000
const buckets = new Map<string, number[]>()

const ALLOWED_URLS = Deno.env.get('ALLOWED_URLS')?.trim() ?? ''
const ALLOWED_ORIGINS = ALLOWED_URLS.split(',').map(s => s.trim()).filter(Boolean)

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.length === 0 || !ALLOWED_ORIGINS.includes(origin)) {
    return {}
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function log(level: string, message: string, extra?: Record<string, unknown>) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    environment: Deno.env.get('VERCEL_ENV') || 'production',
    service: 'send-email',
    message,
    ...extra,
  }))
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
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
    log('WARN', 'Method not allowed', { method: req.method })
    return json(req, { error: 'Method not allowed' }, 405)
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const timestamps = (buckets.get(ip) ?? []).filter(t => now - t < RATE_WINDOW)
  if (timestamps.length >= RATE_LIMIT) {
    log('WARN', 'Rate limit exceeded', { ip })
    return json(req, { error: 'Too many requests. Please wait before trying again.' }, 429)
  }
  timestamps.push(now)
  buckets.set(ip, timestamps)

  // ponytail: sweep stale IPs every request, tiny map so O(n) is fine
  if (buckets.size > 0 && now % 60_000 < 1000) {
    for (const [key, ts] of buckets) {
      if (ts.length === 0 || now - ts[ts.length - 1] > 600_000) buckets.delete(key)
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch (err) {
    log('ERROR', 'Failed to parse request body', { error: String(err) })
    return json(req, { error: 'Invalid request body' }, 400)
  }

  const batch = Array.isArray(body.batch) ? body.batch as Record<string, unknown>[] : null
  const batchEmails = batch?.map((item) => {
    const email = item.template === 'booking_canceled'
      ? renderBookingCanceledEmail({
          firstName: String(item.firstName || 'there'),
          bookingNumber: String(item.bookingNumber || ''),
          reason: String(item.reason || 'Booking deadline passed.'),
        })
      : { subject: String(item.subject || ''), text: String(item.text || ''), html: item.html as string | undefined }

    return {
      from: (item.from as string) || `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: Array.isArray(item.to) ? item.to : [item.to as string],
      subject: email.subject,
      ...(email.html ? { html: email.html } : { text: email.text }),
    }
  })

  if (body.template === 'booking_canceled') {
    const email = renderBookingCanceledEmail({
      firstName: String(body.firstName || 'there'),
      bookingNumber: String(body.bookingNumber || ''),
      reason: String(body.reason || 'Booking deadline passed.'),
    })
    body.subject = email.subject
    body.text = email.text
    body.html = email.html
  }

  const isBatch = Boolean(batchEmails)
  const res = await fetch(isBatch ? 'https://api.resend.com/emails/batch' : 'https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(isBatch && typeof body.idempotencyKey === 'string'
        ? { 'Idempotency-Key': body.idempotencyKey }
        : {}),
    },
    body: JSON.stringify(batchEmails || {
      from: (body.from as string) || `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: (body.to as string) || DEVELOPER_EMAIL,
      subject: body.subject,
      ...(body.html ? { html: body.html } : { text: body.text }),
    }),
  })

  const data = await res.json()

  if (res.ok) {
    log('INFO', 'Email sent', { to: body.to || DEVELOPER_EMAIL, subject: body.subject })
    return json(req, { success: true })
  }

  log('ERROR', 'Resend API error', {
    status: res.status,
    error: data.message || 'Unknown',
    to: body.to,
    subject: body.subject,
  })

  return json(req, { error: data.message || 'Failed to send' }, 400)
})
