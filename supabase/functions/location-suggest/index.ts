import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RATE_LIMIT = 20
const RATE_WINDOW_SECONDS = 60

interface RateLimitResult {
  allowed: boolean
  retry_after_seconds: number
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENROUTE_SERVICE_API_KEY = Deno.env.get('OPENROUTE_SERVICE_API_KEY') ?? ''
const ALLOWED_URLS = Deno.env.get('ALLOWED_URLS')?.trim() ?? ''
const ALLOWED_ORIGINS = ALLOWED_URLS.split(',').map((s) => s.trim()).filter(Boolean)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

function buildLabel(name?: string, region?: string, country?: string): string | null {
  if (!name || !region || !country) return null
  return `${name}, ${region}, ${country}`
}

serve(async (req) => {
  if (!ALLOWED_URLS) {
    console.error('[location-suggest] ALLOWED_URLS not configured')
    return json(req, { error: 'ALLOWED_URLS is not configured' }, 500)
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') {
    console.error('[location-suggest] Invalid method:', req.method)
    return json(req, { error: 'Method not allowed' }, 405)
  }
  if (!OPENROUTE_SERVICE_API_KEY) {
    console.error('[location-suggest] OPENROUTE_SERVICE_API_KEY not configured')
    return json(req, { error: 'OpenRouteService is not configured' }, 500)
  }

  const body = await req.json().catch(() => null) as { query?: string } | null
  const query = body?.query?.trim() ?? ''
  if (query.length < 3) return json(req, { suggestions: [] })

  const { data, error: rateLimitError } = await supabase
    .rpc('consume_global_rate_limit', {
      limit_key: 'location-suggest',
      max_requests: RATE_LIMIT,
      window_seconds: RATE_WINDOW_SECONDS,
    })
    .single()
  const rateLimit = data as unknown as RateLimitResult

  if (rateLimitError || !rateLimit) {
    console.error('[location-suggest] Rate limit check failed', rateLimitError)
    return json(req, { error: 'Rate limit unavailable' }, 500)
  }

  if (!rateLimit.allowed) {
    console.error('[location-suggest] Rate limit exceeded, retry after', rateLimit.retry_after_seconds, 's')
    return json(req, {
      error: 'Too many requests. Please wait before trying again.',
      retryAfterSeconds: rateLimit.retry_after_seconds,
    }, 429)
  }

  const url = new URL('https://api.openrouteservice.org/geocode/autocomplete')
  url.searchParams.set('api_key', OPENROUTE_SERVICE_API_KEY)
  url.searchParams.set('text', query)
  url.searchParams.set('boundary.country', 'PH')
  url.searchParams.set('size', '6')

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    const reason = err instanceof DOMException && err.name === 'TimeoutError'
      ? 'timeout'
      : 'network error'
    console.error('[location-suggest] Cannot reach OpenRouteService:', reason, 'query:', query)
    return json(req, { error: `Location lookup failed: ${reason}` }, 504)
  }
  if (!response.ok) {
    console.error('[location-suggest] OpenRouteService returned', response.status, 'for query:', query)
    return json(req, { error: 'Location lookup failed' }, 502)
  }

  const payload = await response.json()
  const suggestions = (payload.features ?? []).map((feature: Record<string, any>) => {
    const props = feature.properties ?? {}
    const rawLabel = props.label ?? props.name ?? ''
    const label = buildLabel(props.name, props.region, props.country) ?? rawLabel
    return {
      id: props.id ?? props.gid ?? rawLabel,
      label,
      address: label,
      lat: feature.geometry?.coordinates?.[1],
      lng: feature.geometry?.coordinates?.[0],
    }
  }).filter((item: Record<string, any>) => item.address && Number.isFinite(item.lat) && Number.isFinite(item.lng))

  return json(req, { suggestions })
})
