import { beforeEach, describe, expect, it, vi } from 'vitest'
import { removeVehicleImage } from '@/services/vehicle-service'

const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: vi.fn(() => ({ remove: mocks.remove })) },
    from: vi.fn(() => ({ insert: mocks.insert })),
  },
}))

describe('vehicle-service cleanup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queues a vehicle image when direct removal fails', async () => {
    mocks.remove.mockResolvedValue({ error: new Error('storage failed') })
    mocks.insert.mockResolvedValue({ error: null })

    await expect(removeVehicleImage('https://example.com/storage/v1/object/public/vehicle-images/vehicle-1.jpg'))
      .rejects.toThrow('storage failed')

    expect(mocks.insert).toHaveBeenCalledWith({ bucket: 'vehicle-images', file_path: 'vehicle-1.jpg' })
  })
})
