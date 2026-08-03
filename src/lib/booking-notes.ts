export function getDisplayBookingNote(note: string | null | undefined) {
  if (!note) return null

  const visibleNote = note
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith('Complete Address:'))
    .join('\n\n')
    .trim()

  return visibleNote || null
}
