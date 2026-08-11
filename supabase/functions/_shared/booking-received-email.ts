import { detailRows, escapeHtml, renderEmailLayout } from './email-layout.ts'

export interface BookingReceivedEmailInput {
  firstName: string
  bookingNumber: string
  details: Array<[string, string]>
  fuelEstimate?: string
  tollEstimate?: string
  logoUrl?: string
}

export function renderBookingReceivedEmail(input: BookingReceivedEmailInput) {
  const name = escapeHtml(input.firstName || 'Customer')
  const rows = detailRows([
    ...input.details,
    ...(input.fuelEstimate ? [['Fuel estimate', input.fuelEstimate] as [string, string]] : []),
    ...(input.tollEstimate ? [['Toll estimate', input.tollEstimate] as [string, string]] : []),
  ])
  const text = [
    `Hi ${input.firstName || 'Customer'},`,
    '',
    'We received your booking request and our team will review it shortly.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    ...input.details.map(([label, value]) => `${label}: ${value}`),
    ...(input.fuelEstimate ? [`Fuel estimate: ${input.fuelEstimate}`] : []),
    ...(input.tollEstimate ? [`Toll estimate: ${input.tollEstimate}`] : []),
    '',
    'We will contact you once the booking has been reviewed.',
  ].join('\n')
  const html = renderEmailLayout({
    logoUrl: input.logoUrl,
    preheader: `We received your booking ${input.bookingNumber}.`,
    label: 'Booking received',
    title: `Thanks for booking, ${name}.`,
    intro: 'We have your request and our team will review it shortly. Here is a summary of what you submitted.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #071f52;">${rows}</table><div style="margin-top:20px; padding:14px 16px; border-left:4px solid #e92935; background:#fff4f4; color:#071f52; font-size:12px; line-height:1.6;"><strong>Next step:</strong> We will contact you once the booking has been reviewed.</div>`,
    footer: `Please keep your booking number <strong>${escapeHtml(input.bookingNumber)}</strong> for reference.`,
  })

  return { subject: `Booking received: ${input.bookingNumber}`, text, html }
}
