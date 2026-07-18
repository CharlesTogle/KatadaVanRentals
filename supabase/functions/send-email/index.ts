import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DEVELOPER_EMAIL = Deno.env.get('DEVELOPER_EMAIL')!
const SENDER_NAME = Deno.env.get('SENDER_NAME') ?? 'Katada Van Rentals'
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL')!

const RATE_LIMIT = 10
const RATE_WINDOW = 60_000
const buckets = new Map<string, number[]>()

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_URLS') ?? '').split(',').map(s => s.trim()).filter(Boolean)

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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
