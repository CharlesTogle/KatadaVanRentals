import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { countries } from '@/lib/countries'
import { cn } from '@/lib/utils'

type CountrySelectProps = {
  value: string
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
  className?: string
}

export function CountrySelect({ value, onChange, required = false, invalid = false, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const options = value && !countries.includes(value) ? [value, ...countries] : countries
  const filteredCountries = options.filter((country) => country.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    searchRef.current?.focus()

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const fieldClassName = 'block w-full rounded-lg border bg-[#f7f9ff] px-3 py-2 text-xs font-semibold text-[#071f52] transition-colors focus:bg-white focus:outline-none focus:ring-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm'

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input type="text" value={value} required={required} tabIndex={-1} aria-label="Selected country" className="pointer-events-none absolute h-px w-px opacity-0" onChange={() => undefined} />
      <button
        type="button"
        aria-label="Country"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => { setOpen(!open); setQuery('') }}
        className={cn(fieldClassName, 'flex items-center justify-between text-left', invalid ? 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30' : 'border-[#071f52]/14 focus:border-[#071f52] focus:ring-[#ffd923]/60')}
      >
        <span className={value ? '' : 'text-[#071f52]/38'}>{value || 'Select a country'}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-[#071f52]/45 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute bottom-full z-20 mb-2 w-full rounded-2xl border border-[#071f52]/12 bg-white p-2 shadow-[0_12px_28px_rgba(7,31,82,0.15)]">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/40" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries"
              aria-label="Search countries"
              className="block w-full rounded-xl border border-[#071f52]/12 bg-[#f7f9ff] py-2 pl-9 pr-3 text-sm font-semibold text-[#071f52] outline-none focus:border-[#071f52] focus:ring-2 focus:ring-[#ffd923]/60"
            />
          </div>
          <div role="listbox" aria-label="Countries" className="mt-2 max-h-56 overflow-y-auto">
            {filteredCountries.length ? filteredCountries.map((country) => (
              <button
                key={country}
                type="button"
                role="option"
                aria-selected={country === value}
                onClick={() => { onChange(country); setOpen(false); setQuery('') }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#071f52] hover:bg-[#ffd923]/25"
              >
                {country}
                {country === value ? <Check size={15} className="text-[#16a34a]" /> : null}
              </button>
            )) : <p className="px-3 py-3 text-sm font-medium text-[#071f52]/50">No countries found.</p>}
          </div>
        </div>
      ) : null}
    </div>
  )
}
