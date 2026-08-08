export interface BookingDateSelection {
  start: string
  end: string
  availableVehicleIds?: string[]
}

const STORAGE_KEY = 'booking-date-selection'

export function loadBookingDateSelection(): BookingDateSelection | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<BookingDateSelection>
    return {
      start: typeof parsed.start === 'string' ? parsed.start : '',
      end: typeof parsed.end === 'string' ? parsed.end : '',
      ...(Array.isArray(parsed.availableVehicleIds) ? { availableVehicleIds: parsed.availableVehicleIds.filter((id): id is string => typeof id === 'string') } : {}),
    }
  } catch {
    return null
  }
}

export function saveBookingDateSelection(selection: BookingDateSelection): void {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
}
