import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getVehicleUnavailableRanges } from '@/services/vehicle-service'

const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}))

describe('getVehicleUnavailableRanges', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('requests unavailable ranges for a vehicle', async () => {
    rpc.mockResolvedValue({
      data: [{ start_at: '2026-08-12T00:00:00Z', end_at: '2026-08-14T00:00:00Z' }],
      error: null,
    })

    await expect(getVehicleUnavailableRanges('vehicle-1')).resolves.toEqual([
      { start_at: '2026-08-12T00:00:00Z', end_at: '2026-08-14T00:00:00Z' },
    ])
    expect(rpc).toHaveBeenCalledWith('get_vehicle_unavailable_ranges', {
      p_vehicle_id: 'vehicle-1',
      p_from_at: expect.any(String),
      p_to_at: expect.any(String),
    })
  })

  it('throws availability query errors', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('availability unavailable') })

    await expect(getVehicleUnavailableRanges('vehicle-1')).rejects.toThrow('availability unavailable')
  })
})
