import { detailRows, escapeHtml, renderEmailLayout } from './email-layout.ts'

export interface BookingCanceledEmailInput {
  firstName: string
  bookingNumber: string
  reason: string
  logoUrl?: string
}

export function renderBookingCanceledEmail(input: BookingCanceledEmailInput) {
  const greetingName = input.firstName || 'there'
  const text = [
    `Hi ${greetingName},`,
    '',
    'Your booking has been canceled.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    `Reason: ${input.reason}`,
    '',
    'Please contact us if you need help with a new booking.',
  ].join('\n')

  const rows = detailRows([
    ['Booking number', input.bookingNumber],
    ['Reason', input.reason],
  ])
  const html = renderEmailLayout({
    logoUrl: input.logoUrl,
    preheader: `Your booking ${input.bookingNumber} has been canceled.`,
    label: 'Booking update / canceled',
    title: 'Your booking has been canceled.',
    intro: `Hi ${escapeHtml(greetingName)}, here are the details for your records.`,
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #071f52;">${rows}</table><div style="margin-top:20px; padding:15px 16px; border-left:4px solid #e92935; background:#fff4f4; color:#071f52; font-size:12px; line-height:1.6;">Please contact us if you need help with a new booking.</div>`,
    footer: `Keep your booking number <strong>${escapeHtml(input.bookingNumber)}</strong> for reference.`,
  })

  return {
    subject: `Booking canceled: ${input.bookingNumber}`,
    text,
    html,
  }
}
