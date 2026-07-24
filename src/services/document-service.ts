import { supabase } from '@/lib/supabase'
import type { CustomerDocument, DocumentType } from '@/types/document'

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
