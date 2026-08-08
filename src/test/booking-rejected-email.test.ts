import { describe, expect, it } from 'vitest'
import { renderBookingRejectedEmail } from '../../supabase/functions/_shared/booking-rejected-email'

describe('booking rejected email', () => {
  it('includes the booking number and rejection reason', () => {
    const email = renderBookingRejectedEmail({
      firstName: 'Vivrelavie',
      bookingNumber: 'CR-260806-ABCD',
      reason: 'The requested vehicle is unavailable.',
    })

    expect(email.subject).toBe('Booking update: CR-260806-ABCD')
    expect(email.text).toContain('CR-260806-ABCD')
    expect(email.text).toContain('The requested vehicle is unavailable.')
    expect(email.html).toContain('not accepted')
  })
})
