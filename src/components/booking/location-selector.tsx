import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { suggestLocations } from '@/services/location-service'
import type { LocationSuggestion, SelectedLocation } from '@/types/location'

interface LocationSelectorProps {
  id: string
  label: string
  value: string
  placeholder: string
  required?: boolean
  readOnly?: boolean
  onChange: (value: string) => void
  onSelect: (selection: SelectedLocation) => void
}

export function LocationSelector({ id, label, value, placeholder, required = false, readOnly = false, onChange, onSelect }: LocationSelectorProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectedAddressRef = useRef('')
  const lastQueryRef = useRef('')
  const cacheRef = useRef(new Map<string, LocationSuggestion[]>())

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsFocused(false)
        setSuggestions([])
        setLoading(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    const trimmedValue = value.trim()

    if (!isFocused) {
      setSuggestions([])
      setLoading(false)
      return
    }

    if (readOnly) {
      setSuggestions([])
      setLoading(false)
      return
    }

    if (selectedAddressRef.current && trimmedValue === selectedAddressRef.current) {
      setSuggestions([])
      setLoading(false)
      return
    }

    if (trimmedValue.length < 3) {
      setSuggestions([])
      setLoading(false)
      return
    }

    const cachedSuggestions = cacheRef.current.get(trimmedValue.toLowerCase())
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions)
      setLoading(false)
      return
    }

    const normalizedValue = trimmedValue.toLowerCase()
    const normalizedQuery = lastQueryRef.current.toLowerCase()
    const lastQuerySuggestions = cacheRef.current.get(normalizedQuery)
    if (lastQueryRef.current && normalizedValue.startsWith(normalizedQuery) && lastQuerySuggestions) {
      const filteredSuggestions = lastQuerySuggestions.filter((suggestion) => suggestion.label.toLowerCase().includes(normalizedValue))
      if (filteredSuggestions.length > 0) {
        setSuggestions(filteredSuggestions)
        setLoading(false)
        return
      }
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)

      try {
        const nextSuggestions = await suggestLocations(trimmedValue)
        lastQueryRef.current = trimmedValue
        cacheRef.current.set(trimmedValue.toLowerCase(), nextSuggestions)
        setSuggestions(nextSuggestions)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [value, isFocused, readOnly])

  const normalizedValue = value.trim().toLowerCase()
  const visibleSuggestions = normalizedValue.length >= 3
    ? suggestions.filter((suggestion) => suggestion.label.toLowerCase().includes(normalizedValue))
    : []

  return (
    <div
      ref={containerRef}
      onBlur={() => {
        window.setTimeout(() => {
          if (!containerRef.current?.contains(document.activeElement)) {
            setIsFocused(false)
            setSuggestions([])
            setLoading(false)
          }
        })
      }}
      className="space-y-1.5"
    >
      <label htmlFor={id} className="text-sm font-bold text-[#071f52]">{label}{required ? <span className="text-[#e92935]"> *</span> : null}</label>
      <div className="relative">
        <input
          id={id}
          value={value}
          readOnly={readOnly}
          onFocus={() => {
            if (!readOnly) {
              setIsFocused(true)
            }
          }}
          onChange={(event) => {
            if (readOnly) return
            const nextValue = event.target.value
            if (selectedAddressRef.current && nextValue.trim() !== selectedAddressRef.current) {
              selectedAddressRef.current = ''
            }
            onChange(nextValue)
            onSelect({ address: nextValue, lat: null, lng: null })
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />

        {(value.trim().length > 0 && value.trim().length < 3) || loading || visibleSuggestions.length > 0 ? (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-[#071f52]/10 bg-white shadow-[0_18px_44px_rgba(7,31,82,0.12)]">
            {value.trim().length > 0 && value.trim().length < 3 ? (
              <p className="px-4 py-3 text-sm font-semibold text-[#071f52]/48">Keep Typing...</p>
            ) : loading ? (
              <p className="px-4 py-3 text-sm font-semibold text-[#071f52]/48">Looking up locations...</p>
            ) : visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => {
                  selectedAddressRef.current = suggestion.address.trim()
                  onChange(suggestion.address)
                  onSelect({ address: suggestion.address, lat: suggestion.lat, lng: suggestion.lng })
                  setSuggestions([])
                }}
                className="flex w-full items-start gap-3 border-t border-[#071f52]/6 px-4 py-3 text-left first:border-t-0 hover:bg-[#f7f9ff]"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#071f52]/42" />
                <span className="text-sm font-semibold text-[#071f52]">{suggestion.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
