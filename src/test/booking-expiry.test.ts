import { describe, expect, it } from 'vitest'
import { getBookingExpiryDeadline, getBookingExpiryMessage } from '@/lib/booking-expiry'

describe('booking expiry', () => {
  it('subtracts the configured hours from start_at', () => {
    expect(getBookingExpiryDeadline('2026-08-10T12:00:00.000Z', 2).toISOString())
      .toBe('2026-08-10T10:00:00.000Z')
  })

  it('uses status-specific cancellation copy', () => {
    const deadline = new Date('2026-08-10T10:00:00.000Z')
    expect(getBookingExpiryMessage('for_review', deadline)).toContain('not confirmed')
    expect(getBookingExpiryMessage('awaiting_documents', deadline)).toContain('documents')
    expect(getBookingExpiryMessage('pending_price_approval', deadline)).toBeNull()
  })
})
