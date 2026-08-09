import { detailRows, escapeHtml, renderEmailLayout } from './email-layout.ts'

export interface BookingDocumentsRequestedEmailInput {
  firstName: string
  bookingNumber: string
  requestedDocuments: string
  bookingUrl: string
}

export function renderBookingDocumentsRequestedEmail(input: BookingDocumentsRequestedEmailInput) {
  const greetingName = input.firstName || 'there'
  const requestedDocuments = input.requestedDocuments || 'The documents listed in your booking.'
  const text = [
    `Hi ${greetingName},`,
    '',
    'We need some additional documents to continue reviewing your booking.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    `Requested documents: ${requestedDocuments}`,
    '',
    `Upload them directly in your booking: ${input.bookingUrl}`,
    '',
    'Please do not reply to this email. Upload the requested documents directly in the booking.',
  ].join('\n')
  const rows = detailRows([
    ['Booking number', input.bookingNumber],
    ['Requested documents', requestedDocuments],
  ])
  const html = renderEmailLayout({
    preheader: `Documents are needed for booking ${input.bookingNumber}.`,
    label: 'Action needed / booking documents',
    title: 'A few documents are needed.',
    intro: `Hi ${escapeHtml(greetingName)}, we need the following documents to continue reviewing your booking.`,
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #101c32;">${rows}</table><p style="margin:22px 0 0; color:#5f5b54; font-size:12px; line-height:1.7;">Please do not reply to this email. Upload the requested documents directly in your booking.</p><p style="margin:20px 0 0;"><a href="${escapeHtml(input.bookingUrl)}" style="display:inline-block; padding:13px 18px; background:#e92935; color:#ffffff; font-size:12px; font-weight:800; text-decoration:none;">Open your booking</a></p>`,
    footer: `Booking number <strong>${escapeHtml(input.bookingNumber)}</strong> - Upload documents directly in your booking.`,
  })

  return {
    subject: `Documents needed for booking: ${input.bookingNumber}`,
    text,
    html,
  }
}
