import { afterEach, describe, expect, it, vi } from 'vitest'
import { UPLOAD_POLICIES } from '@/config/constants'
import { resizeImageToWebp, validateFile } from '@/lib/file-upload'
import { queueUploadedFileCleanup, removeUploadedFileWithQueue, uploadFile } from '@/services/upload-service'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }))

const storage = vi.mocked(supabase.storage.from)
const file = (size: number, type: string) => new File([new Uint8Array(size)], 'upload', { type })

function mockImageAndCanvas({ blobType = 'image/webp', blob = new Blob(['compressed'], { type: blobType }) } = {}) {
  const createObjectURL = vi.fn().mockReturnValue('blob:profile-photo')
  const revokeObjectURL = vi.fn()
  const drawImage = vi.fn()
  const toBlob = vi.fn((callback: BlobCallback) => callback(blob))
  const canvas = document.createElement('canvas')
  const originalCreateElement = document.createElement.bind(document)
  const createElement = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
    return tagName === 'canvas' ? canvas : originalCreateElement(tagName)
  }) as typeof document.createElement)
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  vi.stubGlobal('Image', class {
    naturalWidth = 1600
    naturalHeight = 800
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_: string) {
      queueMicrotask(() => this.onload?.())
    }
  })
  vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  vi.spyOn(canvas, 'toBlob').mockImplementation(toBlob)

  return { canvas, createElement, createObjectURL, revokeObjectURL, drawImage, toBlob }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('file upload policies', () => {
  it('accepts a 5 MiB PDF customer document', () => {
    expect(() => validateFile(file(5 * 1024 * 1024, 'application/pdf'), UPLOAD_POLICIES.customerDocuments)).not.toThrow()
  })
  it('rejects a customer document larger than 5 MiB', () => {
    expect(() => validateFile(file(5 * 1024 * 1024 + 1, 'application/pdf'), UPLOAD_POLICIES.customerDocuments)).toThrow(/too large/i)
  })
  it('rejects a GIF customer document', () => {
    expect(() => validateFile(file(1, 'image/gif'), UPLOAD_POLICIES.customerDocuments)).toThrow(/unsupported/i)
  })
  it('accepts a 10 MiB WebP vehicle image', () => {
    expect(() => validateFile(file(10 * 1024 * 1024, 'image/webp'), UPLOAD_POLICIES.vehicleImages)).not.toThrow()
  })
  it('rejects an 11 MiB vehicle image', () => {
    expect(() => validateFile(file(10 * 1024 * 1024 + 1, 'image/webp'), UPLOAD_POLICIES.vehicleImages)).toThrow(/too large/i)
  })
  it('rejects an SVG business logo', () => {
    expect(() => validateFile(file(1, 'image/svg+xml'), UPLOAD_POLICIES.businessAssets)).toThrow(/unsupported/i)
  })
  it('accepts a 5 MiB GIF business asset', () => {
    expect(() => validateFile(file(5 * 1024 * 1024, 'image/gif'), UPLOAD_POLICIES.businessAssets)).not.toThrow()
  })
  it('rejects GIF profile photos', () => {
    expect(() => validateFile(file(1, 'image/gif'), UPLOAD_POLICIES.profilePhotos)).toThrow(/unsupported/i)
  })
  it('rejects a business asset larger than 5 MiB', () => {
    expect(() => validateFile(file(5 * 1024 * 1024 + 1, 'image/png'), UPLOAD_POLICIES.businessAssets)).toThrow(/too large/i)
  })
  it('does not call Supabase when validation fails', async () => {
    await expect(uploadFile({ bucket: 'customer-documents', file: file(1, 'image/gif'), path: 'x', policy: UPLOAD_POLICIES.customerDocuments })).rejects.toThrow()
    expect(storage).not.toHaveBeenCalled()
  })
  it('returns the path after a successful Storage upload', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    storage.mockReturnValue({ upload } as never)
    await expect(uploadFile({ bucket: 'customer-documents', file: file(1, 'image/jpeg'), path: 'x', policy: UPLOAD_POLICIES.customerDocuments, upsert: true })).resolves.toBe('x')
    expect(upload).toHaveBeenCalledWith('x', expect.any(File), { upsert: true })
  })
  it('throws the Supabase error after a failed Storage upload', async () => {
    const error = new Error('storage failed')
    storage.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error }) } as never)
    await expect(uploadFile({ bucket: 'customer-documents', file: file(1, 'image/jpeg'), path: 'x', policy: UPLOAD_POLICIES.customerDocuments })).rejects.toBe(error)
  })
  it('queues failed cleanup for durable retry', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await queueUploadedFileCleanup('customer-documents', 'customer-1/requested/doc.pdf')

    expect(supabase.from).toHaveBeenCalledWith('storage_cleanup_queue')
    expect(insert).toHaveBeenCalledWith({ bucket: 'customer-documents', file_path: 'customer-1/requested/doc.pdf' })
  })

  it('queues direct removal failures before rethrowing', async () => {
    const error = new Error('remove failed')
    storage.mockReturnValue({ remove: vi.fn().mockResolvedValue({ error }) } as never)
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await expect(removeUploadedFileWithQueue('payment-receipts', 'customer-1/receipt'))
      .rejects.toBe(error)
    expect(insert).toHaveBeenCalledWith({ bucket: 'payment-receipts', file_path: 'customer-1/receipt' })
  })

  it('treats an existing active queue item as already queued', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505' } })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await expect(queueUploadedFileCleanup('customer-documents', 'customer-1/doc.pdf')).resolves.toBeUndefined()
  })
})

describe('profile photo conversion', () => {
  it('resizes to the max dimension, requests WebP, and revokes the object URL', async () => {
    const { canvas, createObjectURL, revokeObjectURL, drawImage, toBlob } = mockImageAndCanvas()

    const result = await resizeImageToWebp(file(1, 'image/jpeg'))

    expect(canvas.width).toBe(512)
    expect(canvas.height).toBe(256)
    expect(drawImage).toHaveBeenCalledWith(expect.any(Image), 0, 0, 512, 256)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.82)
    expect(result).toMatchObject({ name: 'upload.webp', type: 'image/webp' })
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-photo')
  })

  it('rejects a non-WebP encoder result and still revokes the object URL', async () => {
    const { revokeObjectURL } = mockImageAndCanvas({ blobType: 'image/png' })

    await expect(resizeImageToWebp(file(1, 'image/jpeg'))).rejects.toThrow(/cannot encode.*webp/i)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-photo')
  })

  it('rejects compression failures and still revokes the object URL', async () => {
    const { revokeObjectURL } = mockImageAndCanvas({ blob: null as unknown as Blob })

    await expect(resizeImageToWebp(file(1, 'image/jpeg'))).rejects.toThrow(/compression failed/i)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-photo')
  })
})
