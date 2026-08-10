import { describe, expect, it } from 'vitest'
import { canCustomerCancelBooking, formatCancellationType, getAdminBookingActions, getAdminBookingDetailActions, getBookingPriceBreakdown, getCustomerCancellationRefundStatus, hasRequiredSelfDriveDocuments } from '@/lib/booking-utils'

describe('booking-utils', () => {
  it('uses human-readable cancellation type labels', () => {
    expect(formatCancellationType('customer_request')).toBe('Customer request')
    expect(formatCancellationType('admin_no_refund')).toBe('Admin cancellation without a refund')
  })

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

  it('allows customer cancel for the four cancellable statuses', () => {
    expect(canCustomerCancelBooking('for_review')).toBe(true)
    expect(canCustomerCancelBooking('awaiting_documents')).toBe(true)
    expect(canCustomerCancelBooking('pending_price_approval', 'confirm_with_adjustment')).toBe(true)
    expect(canCustomerCancelBooking('pending_price_approval', 'manual_pricing')).toBe(true)
    expect(canCustomerCancelBooking('pending_price_approval')).toBe(false)
    expect(canCustomerCancelBooking('confirmed')).toBe(true)
    expect(canCustomerCancelBooking('on_trip')).toBe(false)
  })

  it('only queues refunds for pre-confirmation with-driver bookings', () => {
    expect(getCustomerCancellationRefundStatus('for_review', 'all_in')).toBe('pending_refund')
    expect(getCustomerCancellationRefundStatus('awaiting_documents', 'all_out')).toBe('pending_refund')
    expect(getCustomerCancellationRefundStatus('pending_price_approval', 'all_in')).toBe('refund_cancelled')
    expect(getCustomerCancellationRefundStatus('confirmed', 'all_in')).toBe('refund_cancelled')
    expect(getCustomerCancellationRefundStatus('for_review', 'self_drive')).toBe('refund_cancelled')
  })

  it('returns admin actions for live bookings', () => {
    expect(getAdminBookingActions('for_review')).toEqual([
      { label: 'Confirm', nextStatus: 'confirmed' },
      { label: 'Reject', nextStatus: 'rejected' },
    ])
    expect(getAdminBookingActions('completed')).toEqual([])
  })

  it('does not offer another document request while awaiting_documents', () => {
    const awaitingDocsActions = getAdminBookingDetailActions('awaiting_documents')
    expect(awaitingDocsActions.map((action) => action.type)).not.toContain('request_documents')
    expect(awaitingDocsActions.length).toBeGreaterThan(0)
  })

  it('keeps all-in estimates out of booking-time total and remaining balance', () => {
    expect(getBookingPriceBreakdown({
      rentalType: 'all-in',
      startAt: '2026-08-01T08:00:00.000Z',
      endAt: '2026-08-02T08:00:00.000Z',
      basePricePerDay: 4500,
      distanceRatePerKm: 500,
      driverRatePerDay: 800,
      securityDeposit: 10,
      securityDepositType: 'percent',
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
        inServiceArea: true,
      },
    })).toEqual(expect.objectContaining({
      baseTotal: 4500,
      driverTotal: 800,
      fuelEstimateAmount: 315,
      tollEstimateAmount: 105,
      grandTotal: 5300,
      deposit: 530,
      remaining: 4770,
    }))
  })

  it('does not round fuel and toll estimates', () => {
    expect(getBookingPriceBreakdown({
      rentalType: 'all-in',
      startAt: '2026-08-01T08:00:00.000Z',
      endAt: '2026-08-02T08:00:00.000Z',
      basePricePerDay: 4500,
      distanceRatePerKm: 500,
      driverRatePerDay: 800,
      routeQuote: {
        distanceKm: 42,
        durationMinutes: 95,
        tollEstimateAmount: 150370.25,
        tollSegments: [{ name: 'Sample', amount: 150370.25, currency: 'PHP' }],
        fuelEstimateLiters: 5.25,
        fuelEstimateAmount: 24510.75,
        tollEntryPlaza: 'Balintawak',
        tollEntryExpressway: 'NLEX',
        tollExitPlaza: 'Bocaue',
        tollExitExpressway: 'NLEX',
        tollVehicleClass: 1,
        tollRfidBreakdown: [{ system: 'easytrip', amount: 150370.25 }],
        inServiceArea: true,
      },
    })).toEqual(expect.objectContaining({
      fuelEstimateAmount: 24510.75,
      tollEstimateAmount: 150370.25,
    }))
  })
})
