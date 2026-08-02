import { describe, expect, it, vi } from 'vitest'
import { calculateToll, getNearestTollPlazas, suggestLocations } from '@/services/location-service'

const invoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}))

describe('suggestLocations', () => {
  it('skips the edge function for short queries', async () => {
    const result = await suggestLocations('Ma')

    expect(result).toEqual([])
    expect(invoke).not.toHaveBeenCalled()
  })

  it('calls the toll estimator for plaza suggestions and confirmed tolls', async () => {
    invoke
      .mockResolvedValueOnce({
        data: {
          entryCandidates: [{ id: 'nlex-balintawak', name: 'Balintawak', expressway: 'NLEX', label: 'Balintawak (NLEX)', distanceKm: 1.5 }],
          exitCandidates: [{ id: 'nlex-bocaue', name: 'Bocaue', expressway: 'NLEX', label: 'Bocaue (NLEX)', distanceKm: 2.5 }],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          tollEstimateAmount: 105,
          tollSegments: [{ name: 'NLEX: Balintawak to Bocaue', amount: 105, currency: 'PHP' }],
          tollEntryPlaza: 'Balintawak',
          tollEntryExpressway: 'NLEX',
          tollExitPlaza: 'Bocaue',
          tollExitExpressway: 'NLEX',
          tollVehicleClass: 1,
          tollRfidBreakdown: [{ system: 'easytrip', amount: 105 }],
        },
        error: null,
      })

    const plazas = await getNearestTollPlazas({
      pickup: { lat: 14.6, lng: 121.0 },
      dropoff: { lat: 14.7, lng: 120.9 },
    })
    const toll = await calculateToll({
      pickup: { lat: 14.6, lng: 121.0 },
      dropoff: { lat: 14.7, lng: 120.9 },
      entryPlaza: 'nlex-balintawak',
      exitPlaza: 'nlex-bocaue',
      vehicleClass: 1,
    })

    expect(plazas.entryCandidates[0]?.id).toBe('nlex-balintawak')
    expect(toll.tollEstimateAmount).toBe(105)
    expect(invoke).toHaveBeenNthCalledWith(1, 'toll-estimate', expect.any(Object))
    expect(invoke).toHaveBeenNthCalledWith(2, 'toll-estimate', expect.any(Object))
  })
})
