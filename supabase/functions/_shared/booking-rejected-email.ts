import { detailRows, escapeHtml, renderEmailLayout } from './email-layout.ts'

export interface BookingRejectedEmailInput {
  firstName: string
  bookingNumber: string
  reason: string
}

export function renderBookingRejectedEmail(input: BookingRejectedEmailInput) {
  const greetingName = input.firstName || 'there'
  const text = [
    `Hi ${greetingName},`,
    '',
    'We are unable to accept your booking request.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    `Reason: ${input.reason}`,
    '',
    'Please contact us if you need help with a different booking.',
  ].join('\n')

  const rows = detailRows([
    ['Booking number', input.bookingNumber],
    ['Reason', input.reason],
  ])
  const html = renderEmailLayout({
    preheader: `Your booking ${input.bookingNumber} was not accepted.`,
    label: 'Booking update / not accepted',
    title: 'Your booking request was not accepted.',
    intro: `Hi ${escapeHtml(greetingName)}, here are the details for your records.`,
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #101c32;">${rows}</table><div style="margin-top:20px; padding:15px 16px; border-left:4px solid #e92935; background:#fff4f4; color:#101c32; font-size:12px; line-height:1.6;">Please contact us if you need help with a different booking.</div>`,
    footer: `Keep your booking number <strong>${escapeHtml(input.bookingNumber)}</strong> for reference.`,
  })

  return {
    subject: `Booking update: ${input.bookingNumber}`,
    text,
    html,
  }
}
