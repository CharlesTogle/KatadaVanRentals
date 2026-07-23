import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

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
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="fixed inset-0 bg-black/40 animate-in fade-in duration-200" />
      <div
        className={cn(
          'relative z-50 w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-200',
          className,
        )}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="flex items-center justify-between border-b border-[#071f52]/10 px-6 py-4">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#071f52]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#071f52]/40 hover:bg-[#071f52]/6 hover:text-[#071f52] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
