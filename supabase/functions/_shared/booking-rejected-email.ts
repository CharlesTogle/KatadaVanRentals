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

  const escapeHtml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const html = `<div style="margin:0; padding:32px 12px; background:#f7f9ff; font-family:Arial,Helvetica,sans-serif; color:#071f52;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Your booking ${escapeHtml(input.bookingNumber)} was not accepted.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 32px rgba(7,31,82,0.10);">
    <tr><td style="padding:24px 28px; background:#071f52;">
      <div style="font-size:12px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#ffd923;">Katada Van Rentals</div>
      <div style="margin-top:8px; color:#ffffff; font-size:25px; line-height:1.15; font-weight:900;">Booking update</div>
    </td></tr>
    <tr><td style="padding:30px 28px 12px;">
      <div style="display:inline-block; padding:7px 11px; border-radius:99px; background:#e92935; color:#ffffff; font-size:11px; font-weight:800; letter-spacing:.4px;">NOT ACCEPTED</div>
      <h1 style="margin:18px 0 8px; color:#071f52; font-size:23px; line-height:1.2; font-weight:900;">Your booking request was not accepted.</h1>
      <p style="margin:0; color:#52627d; font-size:14px; line-height:1.7;">Hi ${escapeHtml(greetingName)}, here are the details for your records.</p>
    </td></tr>
    <tr><td style="padding:16px 28px 28px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:4px 18px; background:#f7f9ff; border:1px solid #e5ebf7; border-radius:14px;">
        <tr><td style="padding:11px 0; border-bottom:1px solid #e5ebf7; color:#52627d; font-size:13px;">Booking number</td><td style="padding:11px 0; border-bottom:1px solid #e5ebf7; color:#071f52; font-size:13px; font-weight:800; text-align:right;">${escapeHtml(input.bookingNumber)}</td></tr>
        <tr><td style="padding:11px 0; color:#52627d; font-size:13px;">Reason</td><td style="padding:11px 0; color:#071f52; font-size:13px; font-weight:800; text-align:right;">${escapeHtml(input.reason)}</td></tr>
      </table>
      <div style="margin-top:18px; padding:14px 16px; border-left:4px solid #e92935; background:#fff4f4; color:#071f52; font-size:12px; line-height:1.6;">Please contact us if you need help with a different booking.</div>
    </td></tr>
    <tr><td style="padding:18px 28px; background:#fff8d9; color:#071f52; font-size:11px; line-height:1.6;">Keep your booking number <strong>${escapeHtml(input.bookingNumber)}</strong> for reference.</td></tr>
  </table>
</div>`

  return {
    subject: `Booking update: ${input.bookingNumber}`,
    text,
    html,
  }
}
