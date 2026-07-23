import { supabase } from '@/lib/supabase'
import type { CustomerDocument, DocumentType } from '@/types/document'

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
