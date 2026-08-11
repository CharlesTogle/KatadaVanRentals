import { detailRows, escapeHtml, renderEmailLayout } from './email-layout.ts'

export function renderBookingRefundPendingEmail(input: { bookingNumber: string; reason: string; logoUrl?: string }) {
  const text = [
    'A customer cancellation requires a refund review.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    `Cancellation Reason: ${input.reason}`,
    '',
    'Please review and process or cancel the pending refund in the admin booking detail.',
  ].join('\n')

  const rows = detailRows([
    ['Booking number', input.bookingNumber],
    ['Cancellation reason', input.reason],
  ])
  const html = renderEmailLayout({
    logoUrl: input.logoUrl,
    preheader: `Refund review needed for booking ${input.bookingNumber}.`,
    label: 'Refund review needed',
    title: 'A customer cancellation requires a refund review.',
    intro: 'A customer canceled a booking and the refund is pending.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #071f52;">${rows}</table><div style="margin-top:20px; padding:15px 16px; border-left:4px solid #ffd923; background:#fff8d9; color:#071f52; font-size:12px; line-height:1.6;">Review and process or cancel the pending refund in the admin booking detail.</div>`,
    footer: `Booking <strong>${escapeHtml(input.bookingNumber)}</strong> is awaiting refund action.`,
  })

  return {
    subject: `Refund pending: ${input.bookingNumber}`,
    text,
    html,
  }
}
