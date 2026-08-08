import { detailRows, escapeHtml, renderEmailLayout } from './email-layout.ts'

export interface BookingConfirmedEmailInput {
  firstName: string
  bookingNumber: string
  dates: string
  duration: string
  total: string
}

export function renderBookingConfirmedEmail(input: BookingConfirmedEmailInput) {
  const name = escapeHtml(input.firstName || 'there')
  const text = [
    `Hi ${input.firstName || 'there'},`,
    '',
    'Your van rental has been confirmed.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    `Dates: ${input.dates}`,
    `Duration: ${input.duration}`,
    `Total: ${input.total}`,
    '',
    'Thank you for choosing Katada Van Rentals.',
  ].join('\n')
  const rows = detailRows([
    ['Booking number', input.bookingNumber],
    ['Dates', input.dates],
    ['Duration', input.duration],
    ['Total', input.total],
  ])

  const html = renderEmailLayout({
    preheader: `Your booking ${input.bookingNumber} is confirmed.`,
    label: 'Booking confirmed',
    title: `You're all set, ${name}.`,
    intro: 'Your van rental has been confirmed. Keep this email handy for your trip details.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #101c32;">${rows}</table><p style="margin:22px 0 0; color:#5f5b54; font-size:12px; line-height:1.7;">Thank you for choosing Katada Van Rentals. We look forward to getting you on the road.</p>`,
    footer: 'Need help with your booking? Reply to this email or contact our team.',
  })

  return { subject: `Booking Confirmed — ${input.bookingNumber}`, text, html }
}
