import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DEVELOPER_EMAIL = Deno.env.get('DEVELOPER_EMAIL')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { to, subject, text, html, from } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'Katada Van Rentals <onboarding@resend.dev>',
      to: to || DEVELOPER_EMAIL,
      subject,
      ...(html ? { html } : { text }),
    }),
  })

  const data = await res.json()

  if (res.ok) {
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: data.message || 'Failed to send' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
})
