import { describe, expect, it } from 'vitest'
import { getBookingAdjustmentSummary } from '@/lib/booking-adjustment'

describe('getBookingAdjustmentSummary', () => {
  it('uses the latest adjustment event even when the booking total still shows the base total', () => {
    const summary = getBookingAdjustmentSummary(
      {
        total_amount: 1000,
        remaining_amount: 900,
        price_line_items: [{ label: 'Base', detail: '1.00d × ₱1000.00', amount: 1000 }],
      },
      [{ note: 'Price adjusted to 6000. Reason: stale note', created_at: '2026-08-03T04:23:44.416853Z' }],
    )

    expect(summary).toMatchObject({
      adjustedTotal: 6000,
      adjustmentAmount: 5000,
      previousRemainingBalance: 900,
      newRemainingBalance: 5900,
      reason: 'stale note',
    })
  })

  it('does not show a negative old remaining balance after an increase', () => {
    const summary = getBookingAdjustmentSummary(
      {
        total_amount: 6000,
        remaining_amount: 5900,
        price_line_items: [{ label: 'Base', detail: '1.00d × ₱1000.00', amount: 1000 }],
      },
      [{ note: 'Price adjusted to 6000. Reason: Out-of-city surcharge', created_at: '2026-08-03T04:23:44.416853Z' }],
    )

    expect(summary).toMatchObject({
      adjustmentAmount: 5000,
      previousRemainingBalance: 900,
      newRemainingBalance: 5900,
    })
  })

  it('shows the old and new balances when remaining amount preserves the adjustment delta', () => {
    const summary = getBookingAdjustmentSummary(
      {
        total_amount: 6000,
        remaining_amount: 6900,
        price_line_items: [{ label: 'Base', detail: '1.00d × ₱1000.00', amount: 1000 }],
      },
      [{ note: 'Price adjusted to 6000. Reason: Out-of-city surcharge', created_at: '2026-08-03T04:23:44.416853Z' }],
    )

    expect(summary).toMatchObject({
      adjustmentAmount: 5000,
      previousRemainingBalance: 1900,
      newRemainingBalance: 6900,
    })
  })

  it('adds unpaid extension charges to the remaining balance summary', () => {
    const summary = getBookingAdjustmentSummary(
      {
        total_amount: 8000,
        remaining_amount: 7900,
        price_line_items: [{ label: 'Base', detail: '1.00d × ₱1000.00', amount: 1000 }],
      },
      [{ note: 'Price adjusted to 6000. Reason: Out-of-city surcharge', created_at: '2026-08-03T04:23:44.416853Z' }],
      [{ previous_end_at: '2026-08-04T08:00:00Z', new_end_at: '2026-08-06T08:00:00Z', extension_amount: 2000, payment_id: null }],
    )

    expect(summary).toMatchObject({
      adjustmentAmount: 5000,
      extensionAmount: 2000,
      extensionDays: 2,
      previousRemainingBalance: 900,
      newRemainingBalance: 7900,
    })
  })

  it('reconstructs the live total from base, adjustment, and extension history when booking total is stale', () => {
    const summary = getBookingAdjustmentSummary(
      {
        total_amount: 23000,
        remaining_amount: 23700,
        price_line_items: [{ label: 'Base', detail: '23.00d × ₱1000.00', amount: 23000 }],
      },
      [{ note: 'Price adjusted to 26000. Reason: Extra fees', created_at: '2026-08-03T04:23:44.416853Z' }],
      [{ previous_end_at: '2026-08-04T08:00:00Z', new_end_at: '2026-08-13T08:00:00Z', extension_amount: 16500, payment_id: null }],
    )

    expect(summary).toMatchObject({
      adjustedTotal: 26000,
      adjustmentAmount: 3000,
      extensionAmount: 16500,
      previousRemainingBalance: 4200,
      newRemainingBalance: 23700,
    })
  })
})
