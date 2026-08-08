import { supabase } from '@/lib/supabase'
import type { BookingRequestedDocument, CustomerDocument, DocumentType } from '@/types/document'
import { logError } from '@/lib/logger'

const CUSTOMER_DOCUMENT_BUCKET = 'customer-documents'

function getCustomerDocumentPathCandidates(filePath: string) {
  const trimmedPath = filePath.replace(/^\/+/, '')
  const strippedBucketPath = trimmedPath.replace(new RegExp(`^${CUSTOMER_DOCUMENT_BUCKET}/`), '')

  return [...new Set([
    trimmedPath,
    strippedBucketPath,
    `${CUSTOMER_DOCUMENT_BUCKET}/${strippedBucketPath}`,
  ].filter(Boolean))]
}

export async function getCustomerDocuments(userId: string): Promise<CustomerDocument[]> {
  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as CustomerDocument[]
}

export async function saveCustomerDocument(data: {
  customer_id: string
  document_type: DocumentType
  file_path: string
  original_filename: string
  mime_type: string
  size_bytes: number
}) {
  const { error } = await supabase
    .from('customer_documents')
    .upsert(
      {
        ...data,
        status: 'submitted',
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      },
      { onConflict: 'customer_id,document_type' },
    )

  if (error) throw error
}

export async function deleteCustomerDocument(doc: { id: string; file_path: string }) {
  const paths = getCustomerDocumentPathCandidates(doc.file_path)
  const { error: storageError } = await supabase.storage
    .from(CUSTOMER_DOCUMENT_BUCKET)
    .remove(paths)

  if (storageError) throw storageError

  const { error } = await supabase
    .from('customer_documents')
    .delete()
    .eq('id', doc.id)

  if (error) throw error
}

export async function saveBookingRequestedDocument(data: {
  booking_id: string
  customer_id: string
  requested_type_id: string
  file_path: string
  original_filename: string
  mime_type: string
  size_bytes: number
}): Promise<string> {
  const { data: doc, error } = await supabase
    .from('booking_requested_documents')
    .upsert({
      booking_id: data.booking_id,
      customer_id: data.customer_id,
      requested_type_id: data.requested_type_id,
      file_path: data.file_path,
      original_filename: data.original_filename,
      mime_type: data.mime_type,
      size_bytes: data.size_bytes,
      status: 'submitted',
    }, { onConflict: 'requested_type_id' })
    .select('id')
    .single()

  if (error) throw error
  return doc.id
}

export async function deleteBookingRequestedDocument(docId: string): Promise<{ cleanupFailed: boolean }> {
  const { data: doc, error: selectError } = await supabase
    .from('booking_requested_documents')
    .select('file_path')
    .eq('id', docId)
    .single()

  if (selectError) throw selectError

  const { error } = await supabase
    .from('booking_requested_documents')
    .delete()
    .eq('id', docId)

  if (error) throw error

  if (doc?.file_path) {
    const paths = getCustomerDocumentPathCandidates(doc.file_path)
    const { error: removeError } = await supabase.storage.from(CUSTOMER_DOCUMENT_BUCKET).remove(paths)
    if (removeError) {
      logError('documents', 'Failed to remove requested-document file', removeError)
      return { cleanupFailed: true }
    }
  }

  return { cleanupFailed: false }
}

export async function getBookingRequestedDocuments(bookingId: string): Promise<BookingRequestedDocument[]> {
  const { data, error } = await supabase
    .from('booking_requested_documents')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as BookingRequestedDocument[]
}

export async function getCustomerDocumentSignedUrl(filePath: string) {
  let lastError: Error | null = null

  for (const path of getCustomerDocumentPathCandidates(filePath)) {
    const { data, error } = await supabase.storage
      .from(CUSTOMER_DOCUMENT_BUCKET)
      .createSignedUrl(path, 3600)

    if (!error && data?.signedUrl) return data.signedUrl

    lastError = error
  }

  throw lastError || new Error('Unable to create signed URL for document.')
}
