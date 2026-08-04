import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCustomerDocuments, saveCustomerDocument, saveBookingRequestedDocument, deleteBookingRequestedDocument } from '@/services/document-service'

const mocks = vi.hoisted(() => {
  const order = vi.fn()
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const upsert = vi.fn()

  const reqDocSingle = vi.fn()
  const reqDocUpsertSelect = vi.fn(() => ({ single: reqDocSingle }))
  const reqDocUpsert = vi.fn(() => ({ select: reqDocUpsertSelect }))
  const reqDocDeleteEq = vi.fn()
  const reqDocDelete = vi.fn(() => ({ eq: reqDocDeleteEq }))
  const reqDocSelectEq = vi.fn(() => ({ single: reqDocSingle }))
  const reqDocSelect = vi.fn(() => ({ eq: reqDocSelectEq }))

  const from = vi.fn((table: string) => {
    if (table === 'customer_documents') {
      return { select, upsert }
    }

    if (table === 'booking_requested_documents') {
      return {
        select: reqDocSelect,
        upsert: reqDocUpsert,
        delete: reqDocDelete,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  const storageRemove = vi.fn()
  const storageFrom = vi.fn(() => ({ remove: storageRemove }))

  return { order, eq, select, upsert, from, reqDocSingle, reqDocUpsert, reqDocDeleteEq, storageRemove, storageFrom }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from, storage: { from: mocks.storageFrom } },
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

  it('saves a booking requested document with upsert', async () => {
    mocks.reqDocSingle.mockResolvedValue({ data: { id: 'rd-1' }, error: null })

    const docId = await saveBookingRequestedDocument({
      booking_id: 'booking-1',
      customer_id: 'customer-1',
      requested_type_id: 'type-1',
      file_path: 'path/doc.pdf',
      original_filename: 'doc.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024,
    })

    expect(docId).toBe('rd-1')
    expect(mocks.from).toHaveBeenCalledWith('booking_requested_documents')
    expect(mocks.reqDocUpsert).toHaveBeenCalled()
  })

  it('deletes a booking requested document and cleans up storage', async () => {
    mocks.reqDocSingle.mockResolvedValue({ data: { file_path: 'path/doc.pdf' }, error: null })
    mocks.reqDocDeleteEq.mockResolvedValue({ error: null })
    mocks.storageRemove.mockResolvedValue({ error: null })

    await deleteBookingRequestedDocument('rd-1')

    expect(mocks.reqDocDeleteEq).toHaveBeenCalledWith('id', 'rd-1')
    expect(mocks.storageRemove).toHaveBeenCalled()
  })

  it('throws if select fails before delete', async () => {
    mocks.reqDocSingle.mockResolvedValue({ data: null, error: new Error('select failed') })

    await expect(deleteBookingRequestedDocument('rd-1')).rejects.toThrow('select failed')
  })
})
