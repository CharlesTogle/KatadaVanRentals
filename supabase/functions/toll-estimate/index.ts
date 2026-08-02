import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { TOLL_PLAZAS } from '../_shared/toll-plazas.ts'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_URLS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

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

function toRadians(value: number) {
  return value * (Math.PI / 180)
}

function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const earthRadiusKm = 6371
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const startLat = toRadians(from.lat)
  const endLat = toRadians(to.lat)
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceToSegmentKm(point: { lat: number; lng: number }, start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  const kmPerDegreeLat = 111.32
  const kmPerDegreeLng = 111.32 * Math.cos(toRadians(point.lat))
  const px = point.lng * kmPerDegreeLng
  const py = point.lat * kmPerDegreeLat
  const sx = start.lng * kmPerDegreeLng
  const sy = start.lat * kmPerDegreeLat
  const ex = end.lng * kmPerDegreeLng
  const ey = end.lat * kmPerDegreeLat
  const dx = ex - sx
  const dy = ey - sy
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared))
  return Math.hypot(px - (sx + t * dx), py - (sy + t * dy))
}

function nearestRouteDistance(plaza: { lat: number; lng: number }, routeGeometry: Array<{ lat: number; lng: number }>) {
  return routeGeometry.slice(0, -1).reduce((best, point, index) => {
    const distance = distanceToSegmentKm(plaza, point, routeGeometry[index + 1])
    return distance < best.distanceKm ? { distanceKm: distance, index } : best
  }, { distanceKm: Number.POSITIVE_INFINITY, index: 0 })
}

function nearestPlazas(point: { lat: number; lng: number }, routeGeometry: Array<{ lat: number; lng: number }> = [], endFirst = false) {
  return TOLL_PLAZAS
    .map((plaza) => {
      const routeDistance = routeGeometry.length > 1 ? nearestRouteDistance(plaza, routeGeometry) : null
      const nearestDistanceKm = Math.round((routeDistance?.distanceKm ?? distanceKm(point, plaza)) * 100) / 100
      const progress = routeDistance ? routeDistance.index / Math.max(routeGeometry.length - 2, 1) : 0
      return {
        id: plaza.id,
        name: plaza.name,
        expressway: plaza.expressway,
        label: `${plaza.name} (${plaza.expressway})`,
        distanceKm: nearestDistanceKm,
        score: nearestDistanceKm + (endFirst ? 1 - progress : progress),
      }
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map((plaza) => ({
      id: plaza.id,
      name: plaza.name,
      expressway: plaza.expressway,
      label: plaza.label,
      distanceKm: plaza.distanceKm,
    }))
}

function findPlaza(idOrName: string | undefined) {
  if (!idOrName) return null
  return TOLL_PLAZAS.find((plaza) => plaza.id === idOrName || plaza.name === idOrName) ?? null
}

function toSegmentName(segment: Record<string, unknown>) {
  const expresswayName = typeof segment.expresswayName === 'string' ? segment.expresswayName : 'Expressway'
  const entryPlaza = typeof segment.entryPlaza === 'string' ? segment.entryPlaza : 'Entry'
  const exitPlaza = typeof segment.exitPlaza === 'string' ? segment.exitPlaza : 'Exit'
  return `${expresswayName}: ${entryPlaza} to ${exitPlaza}`
}

async function fetchToll(entryPlaza: { name: string }, exitPlaza: { name: string }, vehicleClass: 1 | 2 | 3) {
  const url = new URL('https://www.expressway.ph/api/toll-calculator')
  url.searchParams.set('origin', entryPlaza.name)
  url.searchParams.set('dest', exitPlaza.name)
  url.searchParams.set('class', String(vehicleClass))

  const response = await fetch(url)
  if (response.status === 400) {
    const bodyText = await response.text()
    console.error('[toll-estimate] External toll API 400', {
      url: url.toString(),
      entryName: entryPlaza.name,
      exitName: exitPlaza.name,
      vehicleClass,
      responseBody: bodyText,
    })
    return { error: jsonError('Invalid toll plaza selection', 400) }
  }
  if (response.status === 404) return { error: jsonError('No direct expressway route found between these points', 404) }
  if (!response.ok) return { error: jsonError('Toll calculation failed', 502) }

  return {
    payload: await response.json() as {
      totalToll?: number
      vehicleClass?: 1 | 2 | 3
      segments?: Array<Record<string, unknown>>
      rfidBreakdown?: Array<{ system?: string; total?: number }>
    },
  }
}

function jsonError(message: string, status: number) {
  return { message, status }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const body = await req.json().catch(() => null) as {
    pickup?: { lat?: number | null; lng?: number | null }
    destination?: { lat?: number | null; lng?: number | null }
    dropoff?: { lat?: number | null; lng?: number | null }
    entryPlaza?: string
    exitPlaza?: string
    returnEntryPlaza?: string
    returnExitPlaza?: string
    returnTrip?: boolean
    vehicleClass?: 1 | 2 | 3
    routeGeometry?: Array<{ lat?: number; lng?: number }>
  } | null

  if (body?.pickup?.lat == null || body.pickup.lng == null || body.dropoff?.lat == null || body.dropoff.lng == null) {
    return json(req, { error: 'Pickup and drop-off coordinates are required' }, 400)
  }

  if (!body.entryPlaza || !body.exitPlaza) {
    const routeGeometry = (body.routeGeometry ?? [])
      .filter((point): point is { lat: number; lng: number } => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    const exitPoint = body.destination?.lat != null && body.destination.lng != null
      ? { lat: body.destination.lat, lng: body.destination.lng }
      : { lat: body.dropoff.lat, lng: body.dropoff.lng }

    return json(req, {
      entryCandidates: nearestPlazas({ lat: body.pickup.lat, lng: body.pickup.lng }, routeGeometry),
      exitCandidates: nearestPlazas(exitPoint),
    })
  }

  const entryPlaza = findPlaza(body.entryPlaza)
  const exitPlaza = findPlaza(body.exitPlaza)
  const returnEntryPlaza = findPlaza(body.returnEntryPlaza)
  const pickupNearestPlaza = nearestPlazas({ lat: body.pickup.lat, lng: body.pickup.lng })[0]
  const dropoffNearestPlaza = nearestPlazas({ lat: body.dropoff.lat, lng: body.dropoff.lng })[0]
  const returnExitPlaza = findPlaza(body.returnExitPlaza ?? dropoffNearestPlaza?.id)
  if (!entryPlaza || !exitPlaza || (!!body.returnEntryPlaza && !returnEntryPlaza) || !returnExitPlaza) {
    console.error('[toll-estimate] Invalid plaza selection', {
      sentEntryPlaza: body.entryPlaza,
      foundEntryPlaza: entryPlaza?.id ?? null,
      sentExitPlaza: body.exitPlaza,
      foundExitPlaza: exitPlaza?.id ?? null,
      sentReturnEntryPlaza: body.returnEntryPlaza ?? null,
      foundReturnEntryPlaza: returnEntryPlaza?.id ?? null,
      sentReturnExitPlaza: body.returnExitPlaza ?? null,
      foundReturnExitPlaza: returnExitPlaza?.id ?? null,
      dropoffNearestId: dropoffNearestPlaza?.id ?? null,
    })
    return json(req, { error: 'Invalid toll plaza selection' }, 400)
  }

  const vehicleClass = body.vehicleClass ?? 1
  console.error('[toll-estimate] Pricing toll', {
    entryPlaza: entryPlaza.id,
    exitPlaza: exitPlaza.id,
    returnEntryPlaza: returnEntryPlaza?.id ?? null,
    returnExitPlaza: returnExitPlaza?.id ?? null,
    pickupNearestPlaza: pickupNearestPlaza?.id ?? null,
    dropoffNearestPlaza: dropoffNearestPlaza?.id ?? null,
    samePickupDropoffTollArea: pickupNearestPlaza?.id === dropoffNearestPlaza?.id,
    hasDestination: body.destination?.lat != null && body.destination.lng != null,
    pickupDropoffDistanceKm: Math.round(distanceKm({ lat: body.pickup.lat, lng: body.pickup.lng }, { lat: body.dropoff.lat, lng: body.dropoff.lng }) * 100) / 100,
  })
  const outbound = await fetchToll(entryPlaza, exitPlaza, vehicleClass)
  if (outbound.error) return json(req, { error: outbound.error.message }, outbound.error.status)
  const inbound = returnEntryPlaza && returnExitPlaza ? await fetchToll(returnEntryPlaza, returnExitPlaza, vehicleClass) : null
  if (inbound?.error) return json(req, { error: inbound.error.message }, inbound.error.status)
  const payloads = [outbound.payload, inbound?.payload].filter(Boolean) as NonNullable<typeof outbound.payload>[]
  const rfidTotals = new Map<string, number>()
  for (const payload of payloads) {
    for (const item of payload.rfidBreakdown ?? []) {
      const system = item.system ?? 'unknown'
      rfidTotals.set(system, (rfidTotals.get(system) ?? 0) + Number(item.total ?? 0))
    }
  }

  return json(req, {
    tollEstimateAmount: payloads.reduce((total, payload) => total + Number(payload.totalToll ?? 0), 0),
    tollSegments: payloads.flatMap((payload) => (payload.segments ?? []).map((segment) => ({
      name: toSegmentName(segment),
      amount: Number(segment.toll ?? 0),
      currency: 'PHP',
    }))),
    tollEntryPlaza: entryPlaza.name,
    tollEntryExpressway: entryPlaza.expressway,
    tollExitPlaza: exitPlaza.name,
    tollExitExpressway: exitPlaza.expressway,
    tollVehicleClass: outbound.payload?.vehicleClass ?? vehicleClass,
    tollRfidBreakdown: Array.from(rfidTotals.entries()).map(([system, amount]) => ({
      system,
      amount,
    })),
  })
})
