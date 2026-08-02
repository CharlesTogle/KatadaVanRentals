import { describe, expect, it } from 'vitest'
import { canCustomerCancelBooking, getAdminBookingActions, getBookingPriceBreakdown, hasRequiredSelfDriveDocuments } from '@/lib/booking-utils'

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

  it('adds toll estimates to all-in totals', () => {
    expect(getBookingPriceBreakdown({
      rentalType: 'all-in',
      startAt: '2026-08-01T08:00:00.000Z',
      endAt: '2026-08-02T08:00:00.000Z',
      basePricePerDay: 4500,
      driverRatePerDay: 800,
      routeQuote: {
        distanceKm: 42,
        durationMinutes: 95,
        tollEstimateAmount: 105,
        tollSegments: [{ name: 'NLEX: Balintawak to Bocaue', amount: 105, currency: 'PHP' }],
        fuelEstimateLiters: 5.25,
        fuelEstimateAmount: 315,
        tollEntryPlaza: 'Balintawak',
        tollEntryExpressway: 'NLEX',
        tollExitPlaza: 'Bocaue',
        tollExitExpressway: 'NLEX',
        tollVehicleClass: 1,
        tollRfidBreakdown: [{ system: 'easytrip', amount: 105 }],
      },
    }).grandTotal).toBe(5720)
  })
})
