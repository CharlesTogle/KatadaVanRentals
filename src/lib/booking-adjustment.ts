import type { Booking } from '@/types/booking'

const PRICE_ADJUSTMENT_NOTE_RE = /^Price adjusted to\s+([\d.,]+)\.\s+Reason:\s+(.+)$/i

interface BookingStatusEventLike {
  note: string | null
  created_at: string
}

interface BookingExtensionLike {
  previous_end_at: string | null
  new_end_at: string
  extension_amount: number
  payment_id?: string | null
}

export interface BookingAdjustmentSummary {
  currentTotal: number
  adjustedTotal: number
  baseTotal: number
  adjustmentAmount: number
  extensionAmount: number
  extensionDays: number
  previousRemainingBalance: number
  newRemainingBalance: number
  reason: string | null
  isIncrease: boolean
}

export function getBookingAdjustmentSummary(
  booking: Pick<Booking, 'price_line_items' | 'total_amount' | 'remaining_amount'>,
  statusEvents: BookingStatusEventLike[],
  extensions: BookingExtensionLike[] = [],
): BookingAdjustmentSummary | null {
  const baseTotal = (booking.price_line_items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const extensionAmount = extensions
    .filter((extension) => !extension.payment_id)
    .reduce((sum, extension) => sum + Number(extension.extension_amount || 0), 0)
  const extensionTotal = extensions.reduce((sum, extension) => sum + Number(extension.extension_amount || 0), 0)
  const extensionDays = extensions
    .filter((extension) => !extension.payment_id)
    .reduce((sum, extension) => sum + getExtensionDays(extension.previous_end_at, extension.new_end_at), 0)
  const latestAdjustmentEvent = [...statusEvents]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .find((event) => event.note && PRICE_ADJUSTMENT_NOTE_RE.test(event.note))

  const match = latestAdjustmentEvent?.note?.match(PRICE_ADJUSTMENT_NOTE_RE)
  const parsedAdjustedTotal = match ? Number(match[1].replace(/,/g, '')) : NaN
  const hasEventAdjustedTotal = Number.isFinite(parsedAdjustedTotal)
  const normalizedAdjustmentAmount = hasEventAdjustedTotal
    ? parsedAdjustedTotal - baseTotal
    : 0
  const currentTotal = hasEventAdjustedTotal
    ? parsedAdjustedTotal + extensionTotal
    : booking.total_amount

  if (Math.abs(normalizedAdjustmentAmount) <= 0.009 && Math.abs(extensionAmount) <= 0.009) return null

  const totalDelta = normalizedAdjustmentAmount + extensionAmount
  const remainingLooksUpdated = booking.remaining_amount - totalDelta >= -0.009
  const previousRemainingBalance = remainingLooksUpdated
    ? booking.remaining_amount - totalDelta
    : booking.remaining_amount

  return {
    currentTotal,
    adjustedTotal: hasEventAdjustedTotal ? parsedAdjustedTotal : booking.total_amount,
    baseTotal,
    adjustmentAmount: normalizedAdjustmentAmount,
    extensionAmount,
    extensionDays,
    previousRemainingBalance: Math.max(previousRemainingBalance, 0),
    newRemainingBalance: Math.max(remainingLooksUpdated ? booking.remaining_amount : booking.remaining_amount + totalDelta, 0),
    reason: match?.[2]?.trim() || null,
    isIncrease: normalizedAdjustmentAmount > 0,
  }
}

function getExtensionDays(previousEndAt: string | null, newEndAt: string) {
  if (!previousEndAt) return 0

  const dayMs = 24 * 60 * 60 * 1000
  return Math.max(Math.round((new Date(newEndAt).getTime() - new Date(previousEndAt).getTime()) / dayMs), 0)
}
