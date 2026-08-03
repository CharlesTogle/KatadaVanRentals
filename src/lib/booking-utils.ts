import type { BookingStatus } from '@/types/booking'
import type { CustomerDocument, DocumentType } from '@/types/document'
import type { RouteQuoteResponse } from '@/types/location'

export const SELF_DRIVE_DOCUMENT_TYPES: DocumentType[] = [
  'driver_license',
  'valid_id',
  'proof_of_billing',
]

export function hasRequiredSelfDriveDocuments(documents: CustomerDocument[]) {
  const readyTypes = new Set(
    documents
      .filter((document) => ['submitted', 'verified'].includes(document.status) && document.file_path)
      .map((document) => document.document_type),
  )

  return SELF_DRIVE_DOCUMENT_TYPES.every((type) => readyTypes.has(type))
}

export function getMissingSelfDriveDocuments(documents: CustomerDocument[]) {
  const readyTypes = new Set(
    documents
      .filter((document) => ['submitted', 'verified'].includes(document.status) && document.file_path)
      .map((document) => document.document_type),
  )

  return SELF_DRIVE_DOCUMENT_TYPES.filter((type) => !readyTypes.has(type))
}

export type CustomerRentalType = 'self-drive' | 'all-out' | 'all-in'
export type BookingMode = 'dropoff' | 'keep'

interface BookingPriceBreakdownInput {
  rentalType: CustomerRentalType
  mode?: BookingMode
  startAt: string
  endAt: string
  basePricePerDay: number
  driverRatePerDay: number
  routeQuote?: RouteQuoteResponse | null
}

export function normalizeCustomerRentalType(value: string | null): CustomerRentalType {
  if (value === 'all-in') return 'all-in'
  if (value === 'all-out' || value === 'with-driver') return 'all-out'
  return 'self-drive'
}

export function toBookingRentalModel(rentalType: CustomerRentalType) {
  if (rentalType === 'all-in') return 'all_in' as const
  if (rentalType === 'all-out') return 'all_out' as const
  return 'self_drive' as const
}

export function usesDriver(rentalType: CustomerRentalType) {
  return rentalType === 'all-in' || rentalType === 'all-out'
}

export function getBookingPriceBreakdown({ rentalType, mode = 'keep', startAt, endAt, basePricePerDay, driverRatePerDay, routeQuote }: BookingPriceBreakdownInput) {
  const startDate = startAt ? new Date(startAt) : null
  const endDate = endAt ? new Date(endAt) : null
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : startDate && mode === 'dropoff'
      ? 1
      : 0

  const distanceKm = Number(routeQuote?.distanceKm ?? 0)
  const baseTotal = mode === 'dropoff' && usesDriver(rentalType)
    ? distanceKm * basePricePerDay
    : days * basePricePerDay
  const driverTotal = usesDriver(rentalType) && mode === 'keep' ? days * driverRatePerDay : 0
  const fuelEstimateAmount = rentalType === 'all-in' ? Number(routeQuote?.fuelEstimateAmount ?? 0) : 0
  const tollEstimateAmount = rentalType === 'all-in' ? Number(routeQuote?.tollEstimateAmount ?? 0) : 0
  const grandTotal = baseTotal + driverTotal
  const deposit = rentalType === 'all-in'
    ? Math.round(baseTotal * 0.1)
    : rentalType === 'self-drive'
      ? Math.round(grandTotal * 0.1)
      : 0
  const remaining = Math.max(0, grandTotal - deposit)

  return {
    days,
    distanceKm,
    baseTotal,
    driverTotal,
    fuelEstimateAmount,
    tollEstimateAmount,
    grandTotal,
    deposit,
    remaining,
  }
}

export function canCustomerCancelBooking(status: BookingStatus) {
  return status === 'for_review' || status === 'pending_price_approval' || status === 'confirmed'
}

export type AdminActionType =
  | 'confirm'
  | 'reject'
  | 'adjust_booking'
  | 'request_documents'
  | 'start_trip'
  | 'extend_rental'
  | 'complete'
  | 'make_payment'
  | 'cancel'
  | 'delete'

export interface AdminAction {
  type: AdminActionType
  label: string
  variant: 'primary' | 'danger' | 'secondary'
}

export function getAdminBookingDetailActions(status: BookingStatus): AdminAction[] {
  switch (status) {
    case 'for_review':
      return [
        { type: 'confirm', label: 'Confirm', variant: 'primary' },
        { type: 'reject', label: 'Reject', variant: 'danger' },
        { type: 'adjust_booking', label: 'Confirm with Adjustment', variant: 'secondary' },
        { type: 'request_documents', label: 'Request Documents', variant: 'secondary' },
        { type: 'delete', label: 'Delete Booking', variant: 'danger' },
      ]
    case 'confirmed':
      return [
        { type: 'start_trip', label: 'Release Unit / Start Trip', variant: 'primary' },
        { type: 'extend_rental', label: 'Extend Rental', variant: 'secondary' },
        { type: 'cancel', label: 'Cancel Booking', variant: 'danger' },
        { type: 'delete', label: 'Delete Booking', variant: 'danger' },
      ]
    case 'on_trip':
      return [
        { type: 'complete', label: 'Mark as Returned', variant: 'primary' },
        { type: 'extend_rental', label: 'Extend Rental', variant: 'secondary' },
      ]
    case 'completed':
      return [
        { type: 'delete', label: 'Delete Booking', variant: 'danger' },
      ]
    default:
      return []
  }
}

export function getAdminBookingActions(status: BookingStatus) {
  switch (status) {
    case 'for_review':
    case 'awaiting_documents':
    case 'pending_price_approval':
      return [
        { label: 'Confirm', nextStatus: 'confirmed' as const },
        { label: 'Reject', nextStatus: 'rejected' as const },
      ]
    case 'confirmed':
      return [
        { label: 'Start Trip', nextStatus: 'on_trip' as const },
        { label: 'Cancel', nextStatus: 'canceled' as const },
      ]
    case 'on_trip':
      return [{ label: 'Complete', nextStatus: 'completed' as const }]
    default:
      return []
  }
}

export function formatBookingStatus(status: string) {
  return status.replace(/_/g, ' ')
}

type BookingCadenceLike = {
  rental_model: 'all_in' | 'all_out' | 'self_drive'
  booking_mode?: 'dropoff' | 'keep'
  distance_km?: number | null
  duration_days: number
}

export function isDistanceBasedBooking(booking: Pick<BookingCadenceLike, 'rental_model' | 'booking_mode'>) {
  return booking.rental_model !== 'self_drive' && booking.booking_mode === 'dropoff'
}

export function getBookingCadenceLabel(booking: Pick<BookingCadenceLike, 'rental_model' | 'booking_mode'>) {
  return isDistanceBasedBooking(booking) ? 'Distance' : 'Duration'
}

export function getBookingCadenceValue(booking: BookingCadenceLike) {
  if (isDistanceBasedBooking(booking)) return `${Number(booking.distance_km || 0)} km`
  return `${booking.duration_days} day${booking.duration_days === 1 ? '' : 's'}`
}
