import { describe, expect, it } from 'vitest'
import { canCustomerCancelBooking, getAdminBookingActions, hasRequiredSelfDriveDocuments } from '@/lib/booking-utils'

describe('booking-utils', () => {
  it('requires all self-drive documents', () => {
    expect(hasRequiredSelfDriveDocuments([
      {
        id: '1',
        customer_id: 'customer',
        document_type: 'driver_license',
        status: 'submitted',
        file_path: 'a',
        original_filename: 'a.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1,
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        expires_at: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        customer_id: 'customer',
        document_type: 'valid_id',
        status: 'verified',
        file_path: 'b',
        original_filename: 'b.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1,
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        expires_at: null,
        created_at: '',
        updated_at: '',
      },
    ])).toBe(false)
  })

  it('allows customer cancel only before trip starts', () => {
    expect(canCustomerCancelBooking('for_review')).toBe(true)
    expect(canCustomerCancelBooking('confirmed')).toBe(true)
    expect(canCustomerCancelBooking('on_trip')).toBe(false)
  })

  it('returns admin actions for live bookings', () => {
    expect(getAdminBookingActions('for_review')).toEqual([
      { label: 'Confirm', nextStatus: 'confirmed' },
      { label: 'Reject', nextStatus: 'rejected' },
    ])
    expect(getAdminBookingActions('completed')).toEqual([])
  })
})
