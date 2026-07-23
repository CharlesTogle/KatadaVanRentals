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

export function canCustomerCancelBooking(status: BookingStatus) {
  return status === 'for_review' || status === 'confirmed'
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
