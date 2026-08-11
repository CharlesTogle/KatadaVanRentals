import { describe, expect, it } from 'vitest'
import { renderBookingReceivedEmail } from '../../supabase/functions/_shared/booking-received-email'

describe('booking received email', () => {
  it('uses the shared sharp branded layout', () => {
    const email = renderBookingReceivedEmail({
      firstName: 'Vivrelavie',
      bookingNumber: 'CR-260806-ABCD',
      details: [['Vehicle', 'Toyota Hiace']],
      logoUrl: 'https://katadavanrentals.com/logo.jpg',
    })

    expect(email.subject).toBe('Booking received: CR-260806-ABCD')
    expect(email.text).toContain('Vehicle: Toyota Hiace')
    expect(email.html).toContain('https://katadavanrentals.com/logo.jpg')
    expect(email.html).toContain('Booking received')
    expect(email.html).not.toContain('border-radius')
    expect(email.html).not.toContain('backdrop-filter')
    expect(email.html).not.toContain('animation')
  })
})
