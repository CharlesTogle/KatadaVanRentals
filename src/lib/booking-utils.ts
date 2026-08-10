import type { BookingStatus } from '@/types/booking'
import type { CustomerDocument, DocumentType } from '@/types/document'
import type { RouteQuoteResponse } from '@/types/location'
import { calculateVehicleBookingPrice } from '@/lib/vehicle-pricing'

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
export type RefundStatus = 'pending_refund' | 'refund_processed' | 'refund_cancelled'

interface BookingPriceBreakdownInput {
  rentalType: CustomerRentalType
  mode?: BookingMode
  startAt: string
  endAt: string
  basePricePerDay: number
  distanceRatePerKm: number
  driverRatePerDay: number
  carWashFee?: number
  deliveryFee?: number
  securityDeposit?: number
  securityDepositType?: 'fixed' | 'percent'
  excessRatePerHour?: number
  autoFullDayAfterHours?: number
  twelveHourRate?: number | null
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

export function isSameBookingLocation(pickup: string, dropoff: string) {
  const normalizedPickup = pickup.trim().toLowerCase()
  const normalizedDropoff = dropoff.trim().toLowerCase()
  return Boolean(normalizedPickup && normalizedDropoff && normalizedPickup === normalizedDropoff)
}

export function getBookingPriceBreakdown({ rentalType, mode = 'keep', startAt, endAt, basePricePerDay, distanceRatePerKm, driverRatePerDay, carWashFee = 0, deliveryFee = 0, securityDeposit = 0, securityDepositType = 'fixed', excessRatePerHour = 0, autoFullDayAfterHours = 12, twelveHourRate = null, routeQuote }: BookingPriceBreakdownInput) {
  const startDate = startAt ? new Date(startAt) : null
  const endDate = endAt ? new Date(endAt) : null
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : startDate && mode === 'dropoff'
      ? 1
      : 0

  if (routeQuote?.inServiceArea === false) {
    return { days, distanceKm: 0, baseTotal: 0, driverTotal: 0, fuelEstimateAmount: 0, tollEstimateAmount: 0, grandTotal: 0, deposit: 0, remaining: 0 }
  }

  const distanceKm = Number(routeQuote?.distanceKm ?? 0)
  const vehiclePricing = calculateVehicleBookingPrice({
    rentalType,
    mode,
    days,
    distanceKm,
    basePricePerDay,
    distanceRatePerKm,
    driverRatePerDay,
    carWashFee,
    deliveryFee,
    securityDeposit,
    securityDepositType,
    excessRatePerHour,
    autoFullDayAfterHours,
    twelveHourRate,
  })
  const baseTotal = vehiclePricing.baseTotal
  const driverTotal = vehiclePricing.driverTotal
  const fuelEstimateAmount = rentalType === 'all-in' ? Number(routeQuote?.fuelEstimateAmount ?? 0) : 0
  const tollEstimateAmount = rentalType === 'all-in' ? Number(routeQuote?.tollEstimateAmount ?? 0) : 0
  const taxableTotal = Math.max(0, vehiclePricing.total - vehiclePricing.securityDeposit)
  const rentalTotal = Math.max(0, vehiclePricing.total - vehiclePricing.securityDeposit - vehiclePricing.overdue.amount)
  const deposit = securityDepositType === 'percent'
    ? Math.round(rentalTotal * securityDeposit) / 100
    : vehiclePricing.securityDeposit
  const grandTotal = taxableTotal
  const remaining = Math.max(0, grandTotal - deposit)
  const priceLineItems = vehiclePricing.priceLineItems.filter((item) => item.label !== 'Security Deposit')

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
    carWash: vehiclePricing.carWash,
    delivery: vehiclePricing.delivery,
    securityDeposit: vehiclePricing.securityDeposit,
    overdue: vehiclePricing.overdue,
    priceLineItems,
  }
}

export function canCustomerCancelBooking(status: BookingStatus, priceApprovalSource?: 'confirm_with_adjustment' | 'manual_pricing' | null) {
  return status === 'for_review'
    || status === 'awaiting_documents'
    || status === 'confirmed'
    || (status === 'pending_price_approval' && Boolean(priceApprovalSource))
}

export function getCustomerCancellationRefundStatus(status: BookingStatus, rentalModel: 'all_in' | 'all_out' | 'self_drive'): RefundStatus {
  return (status === 'for_review' || status === 'awaiting_documents' || status === 'pending_price_approval') && rentalModel !== 'self_drive'
    ? 'pending_refund'
    : 'refund_cancelled'
}

export function isRefundIneligible(rentalModel: string | undefined, statusEvents: Array<{ from_status?: string; to_status?: string }> = []) {
  return rentalModel === 'self_drive' || statusEvents.find((event) => event.to_status === 'canceled')?.from_status === 'confirmed'
}

export function canDownloadInvoice(status: BookingStatus) {
  return status === 'confirmed' || status === 'on_trip' || status === 'completed'
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
  | 'set_price_for_manual'
  | 'process_refund'
  | 'cancel_refund'

export interface AdminAction {
  type: AdminActionType
  label: string
  variant: 'primary' | 'danger' | 'secondary'
}

export function getAdminBookingDetailActions(status: BookingStatus, flaggedForManualPricing: boolean = false, refundStatus?: RefundStatus | null): AdminAction[] {
  if (status === 'canceled') {
    if (refundStatus === 'pending_refund') {
      return [
        { type: 'process_refund', label: 'Process Refund', variant: 'primary' },
        { type: 'cancel_refund', label: 'Cancel Refund', variant: 'danger' },
      ]
    }

    return refundStatus === 'refund_cancelled' || refundStatus === 'refund_processed'
      ? [{ type: 'delete', label: 'Delete Booking', variant: 'danger' }]
      : []
  }

  if (flaggedForManualPricing) {
    return [
      { type: 'set_price_for_manual', label: 'Set Price', variant: 'primary' },
      { type: 'reject', label: 'Reject Booking', variant: 'danger' },
      { type: 'cancel', label: 'Cancel Booking', variant: 'danger' },
      { type: 'delete', label: 'Delete Booking', variant: 'danger' },
    ]
  }

  switch (status) {
    case 'for_review':
      return [
        { type: 'confirm', label: 'Confirm', variant: 'primary' },
        { type: 'reject', label: 'Reject Booking', variant: 'danger' },
        { type: 'adjust_booking', label: 'Confirm with Adjustment', variant: 'secondary' },
        { type: 'request_documents', label: 'Request Documents', variant: 'secondary' },
        { type: 'cancel', label: 'Cancel Booking', variant: 'danger' },
        { type: 'delete', label: 'Delete Booking', variant: 'danger' },
      ]
    case 'awaiting_documents':
      return [
        { type: 'confirm', label: 'Confirm', variant: 'primary' },
        { type: 'reject', label: 'Reject Booking', variant: 'danger' },
        { type: 'adjust_booking', label: 'Confirm with Adjustment', variant: 'secondary' },
        { type: 'cancel', label: 'Cancel Booking', variant: 'danger' },
        { type: 'delete', label: 'Delete Booking', variant: 'danger' },
      ]
    case 'pending_price_approval':
      return [
        { type: 'cancel', label: 'Cancel Booking', variant: 'danger' },
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
  const label = status.replace(/_/g, ' ').toLowerCase()
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatCancellationType(type: string) {
  switch (type) {
    case 'customer_request':
      return 'Customer request'
    case 'admin_no_refund':
      return 'Admin cancellation without a refund'
    default:
      return type.replace(/_/g, ' ')
  }
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
