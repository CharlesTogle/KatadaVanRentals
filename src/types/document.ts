export type DocumentType = 'driver_license' | 'valid_id' | 'proof_of_billing'
export type DocumentStatus = 'missing' | 'submitted' | 'verified' | 'rejected' | 'expired'

export interface CustomerDocument {
  id: string
  customer_id: string
  document_type: DocumentType
  status: DocumentStatus
  file_path: string
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}
