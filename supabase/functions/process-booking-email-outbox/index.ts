import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_ATTEMPTS = 3

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date().toISOString()
  const { data: queued, error: loadError } = await supabase
    .from('booking_email_outbox')
    .select('id,recipient_email,first_name,booking_number,email_type,reason,attempts')
    .in('status', ['queued', 'failed', 'processing'])
    .lte('available_at', now)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(100)

  if (loadError) return Response.json({ error: loadError.message }, { status: 500 })

  const claimedEmails = []

  for (const email of queued || []) {
    const { data: claimed } = await supabase
      .from('booking_email_outbox')
      .update({
        status: 'processing',
        attempts: email.attempts + 1,
        available_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        last_error: null,
      })
      .eq('id', email.id)
      .in('status', ['queued', 'failed', 'processing'])
      .lt('attempts', MAX_ATTEMPTS)
      .select('id')
      .maybeSingle()

    if (claimed) claimedEmails.push(email)
  }

  if (claimedEmails.length === 0) return Response.json({ sent: 0, failed: 0 })

  const { error: sendError } = await supabase.functions.invoke('send-email', {
    body: {
      batch: claimedEmails.map((email) => ({
        to: email.recipient_email,
        template: email.email_type,
        firstName: email.first_name,
        bookingNumber: email.booking_number,
        reason: email.reason,
      })),
    },
  })

  const ids = claimedEmails.map((email) => email.id)
  if (sendError) {
    await supabase
      .from('booking_email_outbox')
      .update({
        status: 'failed',
        available_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        last_error: sendError.message,
      })
      .in('id', ids)
    return Response.json({ sent: 0, failed: ids.length })
  }

  await supabase
    .from('booking_email_outbox')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .in('id', ids)

  return Response.json({ sent: ids.length, failed: 0 })
})
