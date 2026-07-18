import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface FaqItemProps {
  question: string
  answer: string
}

export function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.05)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-bold text-[#071f52]">{question}</span>
        <ChevronDown
          size={20}
          className={cn(
            'shrink-0 text-[#071f52]/40 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm leading-6 text-[#071f52]/64">{answer}</p>
        </div>
      )}
    </div>
  )
}
