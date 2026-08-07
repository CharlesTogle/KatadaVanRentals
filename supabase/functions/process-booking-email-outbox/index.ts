import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: queued, error: loadError } = await supabase.rpc(
    'claim_booking_email_outbox',
    { batch_size: 100 },
  )

  if (loadError) return Response.json({ error: loadError.message }, { status: 500 })

  const claimedEmails = queued || []

  if (claimedEmails.length === 0) return Response.json({ sent: 0, failed: 0 })

  const idempotencyKey = `booking-email-outbox:${claimedEmails.map((email) => email.id).sort().join(',')}`
  const { error: sendError } = await supabase.functions.invoke('send-email', {
    body: {
      idempotencyKey,
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
    const { error: updateError } = await supabase
      .from('booking_email_outbox')
      .update({
        status: 'failed',
        available_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        last_error: sendError.message,
      })
      .in('id', ids)
    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }
    return Response.json({ sent: 0, failed: ids.length })
  }

  const { error: updateError } = await supabase
    .from('booking_email_outbox')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ sent: ids.length, failed: 0 })
})
