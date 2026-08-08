export interface BookingConfirmedEmailInput {
  firstName: string
  bookingNumber: string
  dates: string
  duration: string
  total: string
}

export function renderBookingConfirmedEmail(input: BookingConfirmedEmailInput) {
  const escapeHtml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

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
  const rows = [
    ['Booking number', input.bookingNumber],
    ['Dates', input.dates],
    ['Duration', input.duration],
    ['Total', input.total],
  ].map(([label, value]) => `
    <tr>
      <td style="padding: 11px 0; border-bottom: 1px solid #e5ebf7; color: #52627d; font-size: 13px;">${label}</td>
      <td style="padding: 11px 0; border-bottom: 1px solid #e5ebf7; color: #071f52; font-size: 13px; font-weight: 800; text-align: right;">${escapeHtml(value)}</td>
    </tr>`).join('')

  const html = `<div style="margin:0; padding:32px 12px; background:#f7f9ff; font-family:Arial,Helvetica,sans-serif; color:#071f52;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Your booking ${escapeHtml(input.bookingNumber)} is confirmed.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 32px rgba(7,31,82,0.10);">
    <tr><td style="padding:24px 28px; background:#071f52;"><div style="font-size:12px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#ffd923;">Katada Van Rentals</div><div style="margin-top:8px; color:#ffffff; font-size:25px; line-height:1.15; font-weight:900;">Booking confirmed</div></td></tr>
    <tr><td style="padding:30px 28px 12px;"><div style="display:inline-block; padding:7px 11px; border-radius:99px; background:#e92935; color:#ffffff; font-size:11px; font-weight:800; letter-spacing:.4px;">READY TO ROLL</div><h1 style="margin:18px 0 8px; color:#071f52; font-size:23px; line-height:1.2; font-weight:900;">You're all set, ${name}.</h1><p style="margin:0; color:#52627d; font-size:14px; line-height:1.7;">Your van rental has been confirmed. Keep this email handy for your trip details.</p></td></tr>
    <tr><td style="padding:16px 28px 28px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:4px 18px; background:#f7f9ff; border:1px solid #e5ebf7; border-radius:14px;">${rows}</table><p style="margin:22px 0 0; color:#52627d; font-size:12px; line-height:1.7;">Thank you for choosing Katada Van Rentals. We look forward to getting you on the road.</p></td></tr>
    <tr><td style="padding:18px 28px; background:#fff8d9; color:#071f52; font-size:11px; line-height:1.6;">Need help with your booking? Reply to this email or contact our team.</td></tr>
  </table>
</div>`

  return { subject: `Booking Confirmed — ${input.bookingNumber}`, text, html }
}
