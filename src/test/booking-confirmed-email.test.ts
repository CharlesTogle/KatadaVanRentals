import { describe, expect, it } from 'vitest'
import { renderBookingConfirmedEmail } from '../../supabase/functions/_shared/booking-confirmed-email'

describe('booking confirmed email', () => {
  it('includes the booking summary in text and HTML', () => {
    const email = renderBookingConfirmedEmail({
      firstName: 'Vivrelavie',
      bookingNumber: 'CR-260806-ABCD',
      dates: 'Aug 10, 2026 — Aug 12, 2026',
      duration: '2 days',
      total: '₱8,000.00',
    })

    expect(email.subject).toBe('Booking Confirmed — CR-260806-ABCD')
    expect(email.text).toContain('CR-260806-ABCD')
    expect(email.html).toContain('READY TO ROLL')
  })
})
