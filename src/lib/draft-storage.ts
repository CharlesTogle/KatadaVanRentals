const TTL_MS = 600_000

interface DraftEntry<T> {
  data: T
  expiresAt: number
}

export function saveDraft<T>(key: string, data: T): void {
  const entry: DraftEntry<T> = { data, expiresAt: Date.now() + TTL_MS }
  try {
    localStorage.setItem(`fleet_draft:${key}`, JSON.stringify(entry))
  } catch { /* storage full */ }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`fleet_draft:${key}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as DraftEntry<T>
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(`fleet_draft:${key}`)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function clearDraft(key: string): void {
  localStorage.removeItem(`fleet_draft:${key}`)
}
