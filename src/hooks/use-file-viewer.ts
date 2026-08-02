import { useState } from 'react'

interface ViewerState {
  src: string
  alt: string
}

interface OpenFileInput {
  id: string
  path: string
  alt: string
  resolveUrl: (path: string) => Promise<string>
  isPdf?: boolean
}

function looksLikePdf(path: string) {
  return path.toLowerCase().split('?')[0]?.endsWith('.pdf')
}

export function useFileViewer(onError?: (error: Error) => void) {
  const [viewing, setViewing] = useState<ViewerState | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const openFile = async ({ id, path, alt, resolveUrl, isPdf = looksLikePdf(path) }: OpenFileInput) => {
    setOpeningId(id)

    try {
      const src = path.startsWith('http') ? path : await resolveUrl(path)

      if (isPdf) {
        window.open(src, '_blank', 'noopener,noreferrer')
        return
      }

      setViewing({ src, alt })
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setOpeningId(null)
    }
  }

  return {
    viewing,
    openingId,
    openFile,
    closeViewer: () => setViewing(null),
  }
}
