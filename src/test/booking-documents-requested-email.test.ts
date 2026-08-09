import { describe, expect, it } from 'vitest'
import { renderBookingDocumentsRequestedEmail } from '../../supabase/functions/_shared/booking-documents-requested-email'

describe('booking documents requested email', () => {
  it('includes the requested documents and booking link', () => {
    const email = renderBookingDocumentsRequestedEmail({
      firstName: 'Vivrelavie',
      bookingNumber: 'CR-260806-ABCD',
      requestedDocuments: 'Valid ID, Proof of billing',
      bookingUrl: 'https://katada.example/dashboard/bookings/booking-id',
    })

    expect(email.subject).toBe('Documents needed for booking: CR-260806-ABCD')
    expect(email.text).toContain('Valid ID, Proof of billing')
    expect(email.text).toContain('Please do not reply')
    expect(email.html).toContain('https://katada.example/dashboard/bookings/booking-id')
  })
})
