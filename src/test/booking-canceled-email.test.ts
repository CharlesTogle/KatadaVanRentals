import { describe, expect, it } from 'vitest'
import { renderBookingCanceledEmail } from '../../supabase/functions/_shared/booking-canceled-email'

describe('booking canceled email', () => {
  it('includes the booking number and cancellation reason', () => {
    const email = renderBookingCanceledEmail({
      firstName: 'Vivrelavie',
      bookingNumber: 'CR-260806-ABCD',
      reason: 'Booking was not confirmed before the approval deadline.',
    })

    expect(email.subject).toBe('Booking canceled: CR-260806-ABCD')
    expect(email.text).toContain('CR-260806-ABCD')
    expect(email.text).toContain('Booking was not confirmed before the approval deadline.')
  })
})
