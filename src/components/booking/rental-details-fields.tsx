import { useSearchParams } from 'react-router-dom'
import { useBookingStore } from '@/store/booking-store'
import { cn } from '@/lib/utils'

function formatDateTime(value: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function RentalDetailsFields() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''
  const mode = useBookingStore((s) => s.mode)
  const setMode = useBookingStore((s) => s.setMode)

  const setRentalType = (type: 'self-drive' | 'with-driver') => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('type', type)
    setSearchParams(nextParams)
  }

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-bold text-[#071f52]">Rental Type <span className="text-[#e92935]">*</span></label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['self-drive', 'with-driver'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRentalType(type)}
              className={cn(
                'flex min-h-[76px] flex-col items-start justify-center rounded-2xl border px-5 py-4 text-left transition-all',
                rentalType === type
                  ? 'border-[#071f52] bg-[#071f52] text-white shadow-[0_10px_24px_rgba(7,31,82,0.18)]'
                  : 'border-[#071f52]/14 bg-white text-[#071f52]',
              )}
            >
              <span className="text-lg font-black tracking-[-0.02em]">{type === 'self-drive' ? 'Self-Drive' : 'With Driver'}</span>
              <span className={cn('text-sm font-medium', rentalType === type ? 'text-white/78' : 'text-[#071f52]/52')}>
                {type === 'self-drive' ? "You're in control" : 'Sit back & relax'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {rentalType === 'with-driver' && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-[#071f52]">How long do you need the car?</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['dropoff', 'keep'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex min-h-[76px] flex-col items-start justify-center rounded-2xl border px-5 py-4 text-left transition-all',
                  mode === m
                    ? 'border-[#071f52] bg-[#071f52] text-white shadow-[0_10px_24px_rgba(7,31,82,0.18)]'
                    : 'border-[#071f52]/14 bg-white text-[#071f52]',
                )}
              >
                <span className="text-lg font-black tracking-[-0.02em]">{m === 'dropoff' ? 'Just a drop-off' : 'Keep the car'}</span>
                <span className={cn('text-sm font-medium', mode === m ? 'text-white/78' : 'text-[#071f52]/52')}>
                  {m === 'dropoff' ? 'One-way · charged by distance' : 'Round/return · charged per day'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Pick-up Date & Time <span className="text-[#e92935]">*</span></label>
          <input type="text" value={formatDateTime(startParam)} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/72"
          />
        </div>
        {endParam && (
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#071f52]">Return Date & Time <span className="text-[#e92935]">*</span></label>
            <input type="text" value={formatDateTime(endParam)} readOnly
              className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/72"
            />
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-[#16a34a]">Available for selected dates</p>
    </>
  )
}
