import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { normalizeDiagnosticEvent, parseDiagnosticBody } from './diagnostic.ts'

const ALLOWED_URLS = Deno.env.get('ALLOWED_URLS')?.trim() ?? ''
const ALLOWED_ORIGINS = ALLOWED_URLS.split(',').map(s => s.trim()).filter(Boolean)
const requestIds = new WeakMap<Request, string>()
const rateLimitBuckets = new Map<string, number[]>()
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000

function json(req: Request, body: unknown, status = 200) {
  const requestId = requestIdFor(req)
  return new Response(JSON.stringify(body), {
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

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.length === 0 || !ALLOWED_ORIGINS.includes(origin)) {
    return {}
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const requestId = requestIdFor(req)
  if (!ALLOWED_URLS) {
    return json(req, { errorCode: 'CONFIGURATION_ERROR' }, 500)
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json(req, { errorCode: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const clientKey = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const now = Date.now()
  const timestamps = (rateLimitBuckets.get(clientKey) ?? []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) return json(req, { errorCode: 'RATE_LIMITED' }, 429)
  timestamps.push(now)
  rateLimitBuckets.set(clientKey, timestamps)

  let body: Record<string, unknown>
  try {
    body = parseDiagnosticBody(await req.text())
  } catch {
    return json(req, { errorCode: 'INVALID_INPUT' }, 400)
  }

  console.error(JSON.stringify(normalizeDiagnosticEvent(body, requestId, Deno.env.get('VERCEL_ENV') ?? 'production')))

  return json(req, { ok: true })
})
