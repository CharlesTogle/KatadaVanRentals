import { describe, expect, it } from 'vitest'
import { isUnavailableDate } from '@/lib/vehicle-availability'

describe('isUnavailableDate', () => {
  it('treats an open-ended range as unavailable only on its pickup date', () => {
    const unavailableFrom = new Date('2026-08-11T04:00:00Z')
    const ranges = [{ start_at: unavailableFrom.toISOString(), end_at: null }]

    expect(isUnavailableDate(new Date('2026-08-11T12:00:00Z'), ranges)).toBe(true)
    expect(isUnavailableDate(new Date('2028-08-11T12:00:00Z'), ranges)).toBe(false)
  })
})
