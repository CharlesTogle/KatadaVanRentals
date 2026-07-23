import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCustomerDocuments, saveCustomerDocument } from '@/services/document-service'

const mocks = vi.hoisted(() => {
  const order = vi.fn()
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const upsert = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'customer_documents') {
      return {
        select,
        upsert,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { order, eq, select, upsert, from }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

describe('document-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads customer documents in created order', async () => {
    const documents = [{ id: 'doc-1', document_type: 'driver_license' }]
    mocks.order.mockResolvedValueOnce({ data: documents, error: null })

    const result = await getCustomerDocuments('customer-1')

    expect(mocks.from).toHaveBeenCalledWith('customer_documents')
    expect(mocks.select).toHaveBeenCalledWith('*')
    expect(mocks.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    expect(mocks.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result).toEqual(documents)
  })

  it('upserts customer document metadata as submitted', async () => {
    mocks.upsert.mockResolvedValueOnce({ error: null })

    await saveCustomerDocument({
      customer_id: 'customer-1',
      document_type: 'valid_id',
      file_path: 'customer-documents/customer-1/valid_id.pdf',
      original_filename: 'valid-id.pdf',
      mime_type: 'application/pdf',
      size_bytes: 2048,
    })

    expect(mocks.from).toHaveBeenCalledWith('customer_documents')
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        customer_id: 'customer-1',
        document_type: 'valid_id',
        file_path: 'customer-documents/customer-1/valid_id.pdf',
        original_filename: 'valid-id.pdf',
        mime_type: 'application/pdf',
        size_bytes: 2048,
        status: 'submitted',
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      },
      { onConflict: 'customer_id,document_type' },
    )
  })
})
