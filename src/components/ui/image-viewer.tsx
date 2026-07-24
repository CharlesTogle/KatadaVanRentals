import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ImageViewerProps {
  open: boolean
  onClose: () => void
  src: string
  alt?: string
}

function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/60 p-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => zoomOut()}
        className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Zoom out"
      >
        <ZoomOut size={18} />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Reset zoom"
      >
        <RotateCcw size={18} />
      </button>
      <button
        type="button"
        onClick={() => zoomIn()}
        className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Zoom in"
      >
        <ZoomIn size={18} />
      </button>
    </div>
  )
}

export function ImageViewer({ open, onClose, src, alt }: ImageViewerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <div
        className="h-full w-full p-4 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          doubleClick={{ mode: 'toggle' }}
          wheel={{ step: 0.2 }}
          pinch={{ step: 0.2 }}
        >
          <Controls />
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            contentStyle={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={src}
              alt={alt || 'Document'}
              className="mx-auto max-h-[85vh] select-none object-contain"
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>,
    document.body,
  )
}
