import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { saveBookingDateSelection } from '@/lib/booking-date-storage'
import { useBookingStore } from '@/store/booking-store'
import { cn } from '@/lib/utils'

function formatDateTimeInput(value: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value.slice(0, 16)

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function splitDateTimeValue(value: string) {
  const formattedValue = formatDateTimeInput(value)
  if (!formattedValue) return { date: '', time: '' }

  const [date = '', rawTime = ''] = formattedValue.split('T')
  return { date, time: rawTime.slice(0, 5) }
}

function mergeDateTimeValue(date: string, time: string) {
  if (!date || !time) return ''

  return `${date}T${time}`
}

export function RentalDetailsFields() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''
  const initialStart = splitDateTimeValue(startParam)
  const initialEnd = splitDateTimeValue(endParam)
  const mode = useBookingStore((s) => s.mode)
  const setMode = useBookingStore((s) => s.setMode)
  const [startDatePart, setStartDatePart] = useState(initialStart.date)
  const [startTimePart, setStartTimePart] = useState(initialStart.time)
  const [endDatePart, setEndDatePart] = useState(initialEnd.date)
  const [endTimePart, setEndTimePart] = useState(initialEnd.time)
  const skipNextStartClear = useRef(false)
  const skipNextEndClear = useRef(false)

  useEffect(() => {
    if (!startParam) {
      if (skipNextStartClear.current) {
        skipNextStartClear.current = false
        return
      }

      setStartDatePart('')
      setStartTimePart('')
      return
    }

    const nextStart = splitDateTimeValue(startParam)
    setStartDatePart(nextStart.date)
    setStartTimePart(nextStart.time)
  }, [startParam])

  useEffect(() => {
    if (!endParam) {
      if (skipNextEndClear.current) {
        skipNextEndClear.current = false
        return
      }

      setEndDatePart('')
      setEndTimePart('')
      return
    }

    const nextEnd = splitDateTimeValue(endParam)
    setEndDatePart(nextEnd.date)
    setEndTimePart(nextEnd.time)
  }, [endParam])

  const setBookingDate = (field: 'start' | 'end', value: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (value) nextParams.set(field, value)
    else nextParams.delete(field)

    setSearchParams(nextParams)
    saveBookingDateSelection({
      start: field === 'start' ? value : nextParams.get('start') || '',
      end: field === 'end' ? value : nextParams.get('end') || '',
    })
  }

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
          <span className="text-sm font-bold text-[#071f52]">Pick-up Date & Time <span className="text-[#e92935]">*</span></span>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="booking-start-date" className="sr-only">Pick-up Date</label>
              <input
                id="booking-start-date"
                type="date"
                value={startDatePart}
                onChange={(e) => {
                  const nextDate = e.target.value
                  setStartDatePart(nextDate)
                  const nextValue = mergeDateTimeValue(nextDate, startTimePart)
                  skipNextStartClear.current = nextValue === ''
                  setBookingDate('start', nextValue)
                }}
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>
            <div>
              <label htmlFor="booking-start-time" className="sr-only">Pick-up Time</label>
              <input
                id="booking-start-time"
                type="time"
                value={startTimePart}
                onChange={(e) => {
                  const nextTime = e.target.value
                  setStartTimePart(nextTime)
                  const nextValue = mergeDateTimeValue(startDatePart, nextTime)
                  skipNextStartClear.current = nextValue === ''
                  setBookingDate('start', nextValue)
                }}
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>
          </div>
        </div>
        {endParam && (
          <div className="space-y-1.5">
            <span className="text-sm font-bold text-[#071f52]">Return Date & Time <span className="text-[#e92935]">*</span></span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="booking-end-date" className="sr-only">Return Date</label>
                <input
                  id="booking-end-date"
                  type="date"
                  value={endDatePart}
                  onChange={(e) => {
                    const nextDate = e.target.value
                    setEndDatePart(nextDate)
                    const nextValue = mergeDateTimeValue(nextDate, endTimePart)
                    skipNextEndClear.current = nextValue === ''
                    setBookingDate('end', nextValue)
                  }}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
              <div>
                <label htmlFor="booking-end-time" className="sr-only">Return Time</label>
                <input
                  id="booking-end-time"
                  type="time"
                  value={endTimePart}
                  onChange={(e) => {
                    const nextTime = e.target.value
                    setEndTimePart(nextTime)
                    const nextValue = mergeDateTimeValue(endDatePart, nextTime)
                    skipNextEndClear.current = nextValue === ''
                    setBookingDate('end', nextValue)
                  }}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-[#16a34a]">Available for selected dates</p>
    </>
  )
}
