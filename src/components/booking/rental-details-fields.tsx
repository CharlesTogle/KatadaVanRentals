import { useSearchParams } from 'react-router-dom'
import { useBookingStore } from '@/store/booking-store'
import { cn } from '@/lib/utils'

export function RentalDetailsFields() {
  const [searchParams] = useSearchParams()
  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''
  const mode = useBookingStore((s) => s.mode)
  const setMode = useBookingStore((s) => s.setMode)

  return (
    <>
      <div className="flex gap-2 rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] p-1">
        {(['self-drive', 'with-driver'] as const).map((type) => (
          <button
            key={type} type="button"
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
              rentalType === type
                ? 'bg-[#071f52] text-white shadow-sm'
                : 'text-[#071f52]/58',
            )}
          >
            {type === 'self-drive' ? 'Self-Drive' : 'With Driver'}
          </button>
        ))}
      </div>

      {rentalType === 'with-driver' && (
        <div className="flex gap-2 rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] p-1">
          {(['dropoff', 'keep'] as const).map((m) => (
            <button
              key={m} type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
                mode === m ? 'bg-white text-[#071f52] shadow-sm' : 'text-[#071f52]/58',
              )}
            >
              {m === 'dropoff' ? 'Just a drop-off' : 'Keep the car'}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#071f52]">Start Date & Time</label>
          <input type="datetime-local" value={startParam} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]"
          />
        </div>
        {endParam && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#071f52]">End Date & Time</label>
            <input type="datetime-local" value={endParam} readOnly
              className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]"
            />
          </div>
        )}
      </div>
    </>
  )
}
