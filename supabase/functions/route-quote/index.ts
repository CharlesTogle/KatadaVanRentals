import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENROUTE_SERVICE_API_KEY = Deno.env.get('OPENROUTE_SERVICE_API_KEY') ?? ''
const ALLOWED_URLS = Deno.env.get('ALLOWED_URLS')?.trim() ?? ''
const ALLOWED_ORIGINS = ALLOWED_URLS.split(',').map((s) => s.trim()).filter(Boolean)
const DEFAULT_FUEL_PRICE_PER_LITER = 60
const RATE_LIMIT = 10
const RATE_WINDOW_SECONDS = 60
const requestIds = new WeakMap<Request, string>()

interface RateLimitResult {
  allowed: boolean
  retry_after_seconds: number
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

function decodePolyline(value: string) {
  const coordinates: Array<{ lat: number; lng: number }> = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < value.length) {
    let result = 0
    let shift = 0
    let byte = 0

    do {
      byte = value.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lat += result & 1 ? ~(result >> 1) : result >> 1
    result = 0
    shift = 0

    do {
      byte = value.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lng += result & 1 ? ~(result >> 1) : result >> 1
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return coordinates
}

function haversineDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const R = 6371
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function checkServiceArea(
  supabase: ReturnType<typeof createClient>,
  pickup: { lat: number; lng: number },
): Promise<boolean> {
  const { data } = await supabase
    .from('service_points')
    .select('lat,lng,radius_km')
    .eq('is_active', true)

  if (!data || data.length === 0) return true

  return data.some((sp) => {
    if (sp.lat == null || sp.lng == null) return false
    return haversineDistanceKm(pickup, { lat: Number(sp.lat), lng: Number(sp.lng) }) <= Number(sp.radius_km)
  })
}

serve(async (req) => {
  const requestId = requestIdFor(req)
  if (!ALLOWED_URLS) {
    console.error('[route-quote] ALLOWED_URLS is not configured', { requestId })
    return json(req, { errorCode: 'CONFIGURATION_ERROR' }, 500)
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { errorCode: 'METHOD_NOT_ALLOWED' }, 405)
  if (!OPENROUTE_SERVICE_API_KEY) {
    console.error('[route-quote] OPENROUTE_SERVICE_API_KEY is not configured', { requestId })
    return json(req, { errorCode: 'CONFIGURATION_ERROR' }, 500)
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json(req, { errorCode: 'UNAUTHORIZED' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) {
    console.error('[route-quote] Unauthorized request', { requestId })
    return json(req, { errorCode: 'UNAUTHORIZED' }, 401)
  }

  const { data, error: rateLimitError } = await supabase
    .rpc('consume_global_rate_limit', {
      limit_key: 'route-quote',
      max_requests: RATE_LIMIT,
      window_seconds: RATE_WINDOW_SECONDS,
    })
    .single()
  const rateLimit = data as unknown as RateLimitResult

  if (rateLimitError || !rateLimit) {
    console.error('[route-quote] Rate limit check failed', { requestId, errorCode: rateLimitError?.code ?? 'RATE_LIMIT_UNAVAILABLE' })
    return json(req, { errorCode: 'RATE_LIMIT_UNAVAILABLE' }, 500)
  }

  if (!rateLimit.allowed) {
    console.error('[route-quote] Rate limit exceeded', { requestId, retryAfterSeconds: rateLimit.retry_after_seconds })
    return json(req, {
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: rateLimit.retry_after_seconds,
    }, 429)
  }

  const body = await req.json().catch(() => null) as {
    pickup?: { lat?: number | null; lng?: number | null }
    destination?: { lat?: number | null; lng?: number | null }
    dropoff?: { lat?: number | null; lng?: number | null }
    vehicleId?: string
    rentalModel?: 'all_in' | 'all_out' | 'self_drive'
  } | null

  if (body?.pickup?.lat == null || body?.pickup?.lng == null || body?.dropoff?.lat == null || body?.dropoff?.lng == null || !body.vehicleId) {
    console.error('[route-quote] Missing required input', {
      requestId,
      hasPickupLat: body?.pickup?.lat != null,
      hasPickupLng: body?.pickup?.lng != null,
      hasDropoffLat: body?.dropoff?.lat != null,
      hasDropoffLng: body?.dropoff?.lng != null,
      hasVehicleId: !!body?.vehicleId,
    })
    return json(req, { errorCode: 'INVALID_INPUT', message: 'Pickup, drop-off, and vehicle are required' }, 400)
  }

  const [vehicleRes, settingsRes] = await Promise.all([
    supabase.from('vehicles').select('km_per_liter').eq('id', body.vehicleId).single(),
    supabase.from('app_settings').select('fuel_price_per_liter').eq('id', true).maybeSingle(),
  ])

  if (vehicleRes.error) {
    console.error('[route-quote] Vehicle lookup failed', { requestId, vehicleId: body.vehicleId, errorCode: vehicleRes.error.code ?? 'VEHICLE_NOT_FOUND' })
    return json(req, { errorCode: 'VEHICLE_NOT_FOUND' }, 400)
  }

  if (settingsRes.error) {
    console.error('[route-quote] Settings lookup failed; using defaults', { requestId, errorCode: settingsRes.error.code ?? 'SETTINGS_LOOKUP_FAILED' })
  }

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: {
      Authorization: OPENROUTE_SERVICE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [body.pickup.lng, body.pickup.lat],
        ...(body.destination?.lat != null && body.destination.lng != null ? [[body.destination.lng, body.destination.lat]] : []),
        [body.dropoff.lng, body.dropoff.lat],
      ],
      radiuses: body.destination?.lat != null && body.destination.lng != null ? [-1, -1, -1] : [-1, -1],
    }),
  })

  if (!response.ok) {
    console.error('[route-quote] OpenRouteService request failed', {
      status: response.status,
      requestId,
      errorCode: response.status === 404 ? 'ROUTE_NOT_FOUND' : 'ROUTE_CALCULATION_FAILED',
    })
    if (response.status === 404) {
      return json(req, { errorCode: 'ROUTE_NOT_FOUND' }, 422)
    }
    return json(req, { errorCode: 'ROUTE_CALCULATION_FAILED' }, 502)
  }

  const payload = await response.json()
  const route = payload.routes?.[0]
  const summary = route?.summary
  const rawGeometry = Array.isArray(route?.geometry?.coordinates)
    ? route.geometry.coordinates
    : typeof route?.geometry === 'string'
      ? decodePolyline(route.geometry).map((coordinate) => [coordinate.lng, coordinate.lat])
      : []
  const routeGeometry = rawGeometry
    .map((coordinate: unknown) => Array.isArray(coordinate) ? { lat: Number(coordinate[1]), lng: Number(coordinate[0]) } : null)
    .filter((coordinate: { lat: number; lng: number } | null): coordinate is { lat: number; lng: number } => !!coordinate && Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng))
  const distanceKm = Math.round((Number(summary?.distance ?? 0) / 1000) * 100) / 100
  const durationMinutes = Math.round(Number(summary?.duration ?? 0) / 60)

  const kmPerLiter = Number(vehicleRes.data?.km_per_liter)
  if (!Number.isFinite(kmPerLiter) || kmPerLiter <= 0) {
    return json(req, { errorCode: 'INVALID_VEHICLE_SETTINGS' }, 422)
  }
  const fuelPricePerLiter = Number(settingsRes.data?.fuel_price_per_liter || DEFAULT_FUEL_PRICE_PER_LITER)
  const fuelEstimateLiters = body.rentalModel === 'all_in'
    ? Math.round((distanceKm / kmPerLiter) * 100) / 100
    : 0
  const fuelEstimateAmount = Math.round(fuelEstimateLiters * fuelPricePerLiter * 100) / 100

  const inServiceArea = await checkServiceArea(supabase, {
    lat: body.pickup.lat,
    lng: body.pickup.lng,
  })

  return json(req, {
    distanceKm,
    durationMinutes,
    routeGeometry,
    tollEstimateAmount: 0,
    tollSegments: [],
    fuelEstimateLiters,
    fuelEstimateAmount,
    tollEntryPlaza: null,
    tollEntryExpressway: null,
    tollExitPlaza: null,
    tollExitExpressway: null,
    tollVehicleClass: 1,
    tollRfidBreakdown: [],
    inServiceArea,
  })
})
