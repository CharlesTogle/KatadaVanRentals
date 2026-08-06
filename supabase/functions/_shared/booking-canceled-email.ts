export interface BookingCanceledEmailInput {
  firstName: string
  bookingNumber: string
  reason: string
}

export function renderBookingCanceledEmail(input: BookingCanceledEmailInput) {
  const greetingName = input.firstName || 'there'
  const text = [
    `Hi ${greetingName},`,
    '',
    'Your booking has been canceled because it was not confirmed before the deadline.',
    '',
    `Booking Number: ${input.bookingNumber}`,
    `Reason: ${input.reason}`,
    '',
    'Please contact us if you need help with a new booking.',
  ].join('\n')

  const escapeHtml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #071f52;">
      <h1 style="font-size: 22px; font-weight: 900; margin: 0 0 8px;">Booking canceled</h1>
      <p style="font-size: 14px; opacity: 0.7; margin: 0 0 24px;">Hi ${escapeHtml(greetingName)}, your booking was canceled before the trip started.</p>
      <div style="background: #fff4f4; border-radius: 12px; padding: 20px; margin: 0 0 20px;">
        <p style="font-size: 13px; margin: 0 0 8px;"><strong>Booking Number:</strong> ${escapeHtml(input.bookingNumber)}</p>
        <p style="font-size: 13px; margin: 0;"><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>
      </div>
      <p style="font-size: 12px; opacity: 0.5; margin: 0;">Please contact us if you need help with a new booking.</p>
    </div>`

  return {
    subject: `Booking canceled: ${input.bookingNumber}`,
    text,
    html,
  }
}
