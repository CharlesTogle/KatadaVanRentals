import type { BookingStatus } from '@/types/booking'
import type { CustomerDocument, DocumentType } from '@/types/document'

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

interface BookingPriceBreakdownInput {
  rentalType: 'self-drive' | 'with-driver'
  startAt: string
  endAt: string
  basePricePerDay: number
  driverRatePerDay: number
}

export function getBookingPriceBreakdown({ rentalType, startAt, endAt, basePricePerDay, driverRatePerDay }: BookingPriceBreakdownInput) {
  const startDate = startAt ? new Date(startAt) : null
  const endDate = endAt ? new Date(endAt) : null
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const baseTotal = days * basePricePerDay
  const driverTotal = rentalType === 'with-driver' ? days * driverRatePerDay : 0
  const grandTotal = baseTotal + driverTotal
  const deposit = Math.round(grandTotal * 0.1)
  const remaining = Math.max(0, grandTotal - deposit)

  return {
    days,
    baseTotal,
    driverTotal,
    grandTotal,
    deposit,
    remaining,
  }
}

export function canCustomerCancelBooking(status: BookingStatus) {
  return status === 'for_review' || status === 'confirmed'
}

export type AdminActionType =
  | 'confirm'
  | 'reject'
  | 'adjust_booking'
  | 'request_documents'
  | 'start_trip'
  | 'extend_rental'
  | 'complete'
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
        { type: 'adjust_booking', label: 'Adjust Booking', variant: 'secondary' },
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
