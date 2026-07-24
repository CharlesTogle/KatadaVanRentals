import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_URLS') ?? '').split(',').map(s => s.trim()).filter(Boolean)

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

  // Verify caller is admin
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

  const { customerId } = body as { customerId: string }

  if (!customerId) {
    return json(req, { error: 'customerId is required' }, 400)
  }

  // Verify target is a customer
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', customerId)
    .single()

  if (!target || target.role !== 'customer') {
    return json(req, { error: 'Target is not a customer' }, 400)
  }

  // Reject delete when customer has bookings
  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)

  if (count && count > 0) {
    return json(req, { error: `Cannot delete customer with ${count} booking(s). Deactivate instead.` }, 409)
  }

  // Delete auth user (profiles row cascades via FK)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(customerId)
  if (deleteError) {
    return json(req, { error: deleteError.message }, 500)
  }

  return json(req, { success: true })
})
