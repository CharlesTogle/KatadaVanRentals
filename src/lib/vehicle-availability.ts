import type { VehicleUnavailableRange } from '@/types/vehicle'

export function isUnavailableDate(date: Date, ranges: VehicleUnavailableRange[]) {
  const candidate = new Date(date)
  candidate.setHours(0, 0, 0, 0)

  return ranges.some((range) => {
    const start = new Date(range.start_at)
    start.setHours(0, 0, 0, 0)
    if (candidate < start) return false
    if (!range.end_at) return candidate.getTime() === start.getTime()

    const end = new Date(range.end_at)
    end.setHours(0, 0, 0, 0)
    return candidate <= end
  })
}
