import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json()

  console.error(JSON.stringify({
    timestamp: body.timestamp ?? new Date().toISOString(),
    level: body.level ?? 'ERROR',
    environment: body.environment ?? Deno.env.get('VERCEL_ENV') ?? 'production',
    service: body.service ?? 'unknown',
    message: body.message ?? '',
    ...(body.error ? { error: body.error } : {}),
    ...(body.context ? { context: body.context } : {}),
  }))

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
})
