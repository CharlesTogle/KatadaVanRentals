import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { saveBookingDateSelection } from '@/lib/booking-date-storage'
import { normalizeCustomerRentalType, type CustomerRentalType } from '@/lib/booking-utils'
import { useBookingStore } from '@/store/booking-store'
import { cn } from '@/lib/utils'
import { useVehicleUnavailableRanges } from '@/hooks/use-vehicles'
import type { Vehicle, VehicleUnavailableRange } from '@/types/vehicle'

interface RentalDetailsFieldsProps {
  vehicle?: Pick<Vehicle, 'supports_self_drive' | 'supports_all_in' | 'supports_all_out'> | null
}

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

function getUnavailableDays(ranges: VehicleUnavailableRange[], horizon: Date) {
  const days: Date[] = []

  for (const range of ranges) {
    const day = new Date(range.start_at)
    const end = range.end_at ? new Date(range.end_at) : new Date(horizon)
    day.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    for (; day <= end; day.setDate(day.getDate() + 1)) {
      days.push(new Date(day))
    }
  }

  return days
}

export function RentalDetailsFields({ vehicle }: RentalDetailsFieldsProps) {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const rentalType = normalizeCustomerRentalType(searchParams.get('type'))
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''
  const initialStart = splitDateTimeValue(startParam)
  const initialEnd = splitDateTimeValue(endParam)
  const mode = useBookingStore((s) => s.mode)
  const setMode = useBookingStore((s) => s.setMode)
  const { data: unavailableRanges = [], isLoading: isAvailabilityLoading, isError: isAvailabilityError } = useVehicleUnavailableRanges(vehicleId)
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

  const supportsSelfDrive = vehicle?.supports_self_drive !== false
  const supportsAllIn = vehicle?.supports_all_in !== false
  const supportsAllOut = vehicle?.supports_all_out !== false

  const setRentalType = useCallback((type: CustomerRentalType) => {
    if (type === 'self-drive' && !supportsSelfDrive) return
    if (type === 'all-in' && !supportsAllIn) return
    if (type === 'all-out' && !supportsAllOut) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('type', type)
    setSearchParams(nextParams)
  }, [searchParams, setSearchParams, supportsAllIn, supportsAllOut, supportsSelfDrive])

  const setDriverMode = useCallback((nextMode: 'dropoff' | 'keep') => {
    setMode(nextMode)
  }, [setMode])

  const setRentalCategory = (category: 'self-drive' | 'with-driver') => {
    if (category === 'self-drive') {
      setRentalType('self-drive')
      return
    }

    setRentalType(supportsAllIn ? 'all-in' : 'all-out')
  }

  useEffect(() => {
    if (rentalType === 'self-drive' && !supportsSelfDrive) {
      setDriverMode(supportsAllIn ? 'dropoff' : 'keep')
      return
    }

    if (rentalType === 'all-in' && !supportsAllIn) setRentalType('all-out')
    if (rentalType === 'all-out' && !supportsAllOut) setRentalType('all-in')
  }, [rentalType, setDriverMode, setRentalType, supportsAllIn, supportsAllOut, supportsSelfDrive])

  const minPickup = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }, [])
  const minReturn = useMemo(() => {
    if (!startParam) return minPickup
    const pickup = new Date(startParam)
    if (Number.isNaN(pickup.getTime())) return minPickup
    pickup.setHours(0, 0, 0, 0)
    return pickup
  }, [minPickup, startParam])
  const unavailableDays = useMemo(() => {
    const horizon = new Date()
    horizon.setFullYear(horizon.getFullYear() + 2)
    return getUnavailableDays(unavailableRanges, horizon)
  }, [unavailableRanges])

  const withDriver = rentalType !== 'self-drive'

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-bold text-[#071f52]">Rental Type <span className="text-[#e92935]">*</span></label>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { category: 'self-drive', title: 'Self Drive', subtitle: 'Return-date rental fields' },
            { category: 'with-driver', title: 'With Driver', subtitle: 'Choose trip type and package' },
          ] as const).map((option) => (
            <button
              key={option.category}
              type="button"
              onClick={() => setRentalCategory(option.category)}
              disabled={option.category === 'self-drive' ? !supportsSelfDrive : !supportsAllIn && !supportsAllOut}
              className={cn(
                'flex min-h-[76px] flex-col items-start justify-center rounded-2xl border px-5 py-4 text-left transition-all',
                'disabled:cursor-not-allowed disabled:opacity-45',
                (option.category === 'self-drive') !== withDriver
                  ? 'border-[#071f52] bg-[#071f52] text-white shadow-[0_10px_24px_rgba(7,31,82,0.18)]'
                  : 'border-[#071f52]/14 bg-white text-[#071f52]',
              )}
            >
              <span className="text-lg font-black tracking-[-0.02em]">{option.title}</span>
              <span className={cn('text-sm font-medium', (option.category === 'self-drive') !== withDriver ? 'text-white/78' : 'text-[#071f52]/52')}>
                {option.subtitle}
              </span>
            </button>
          ))}
        </div>
      </div>

      {withDriver && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#071f52]">Trip Type <span className="text-[#e92935]">*</span></label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['dropoff', 'keep'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDriverMode(m)}
                  className={cn(
                    'flex min-h-[76px] flex-col items-start justify-center rounded-2xl border px-5 py-4 text-left transition-all',
                    mode === m
                      ? 'border-[#071f52] bg-[#071f52] text-white shadow-[0_10px_24px_rgba(7,31,82,0.18)]'
                      : 'border-[#071f52]/14 bg-white text-[#071f52]',
                  )}
                >
                  <span className="text-lg font-black tracking-[-0.02em]">{m === 'dropoff' ? 'Just a Drop Off' : 'Keep the Car'}</span>
                  <span className={cn('text-sm font-medium', mode === m ? 'text-white/78' : 'text-[#071f52]/52')}>
                    {m === 'dropoff' ? 'One-way · charged by distance' : 'Round/return · charged per day'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#071f52]">Package <span className="text-[#e92935]">*</span></label>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { type: 'all-in', title: 'All In', subtitle: 'Fuel and toll estimate included', supported: supportsAllIn },
                { type: 'all-out', title: 'All Out', subtitle: 'Fuel and toll paid separately', supported: supportsAllOut },
              ] as const).map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setRentalType(option.type)}
                  disabled={!option.supported}
                  className={cn(
                    'flex min-h-[76px] flex-col items-start justify-center rounded-2xl border px-5 py-4 text-left transition-all',
                    'disabled:cursor-not-allowed disabled:opacity-45',
                    rentalType === option.type
                      ? 'border-[#071f52] bg-[#071f52] text-white shadow-[0_10px_24px_rgba(7,31,82,0.18)]'
                      : 'border-[#071f52]/14 bg-white text-[#071f52]',
                  )}
                >
                  <span className="text-lg font-black tracking-[-0.02em]">{option.title}</span>
                  <span className={cn('text-sm font-medium', rentalType === option.type ? 'text-white/78' : 'text-[#071f52]/52')}>
                    {option.subtitle}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimePicker
          id="booking-start-at"
          label="Pick-up Date & Time"
          required
           minDateTime={minPickup}
           disabledDates={unavailableDays}
          value={mergeDateTimeValue(startDatePart, startTimePart)}
          placeholder="Select date & time"
          onChange={(value) => {
            const nextStart = splitDateTimeValue(value)
            setStartDatePart(nextStart.date)
            setStartTimePart(nextStart.time)
            skipNextStartClear.current = value === ''
            setBookingDate('start', value)
          }}
        />
        {(rentalType === 'self-drive' || mode === 'keep') && (
          <DateTimePicker
            id="booking-end-at"
            label="Return Date & Time"
            required
             minDateTime={minReturn}
             disabledDates={unavailableDays}
            value={mergeDateTimeValue(endDatePart, endTimePart)}
            placeholder="Select date & time"
            onChange={(value) => {
              const nextEnd = splitDateTimeValue(value)
              setEndDatePart(nextEnd.date)
              setEndTimePart(nextEnd.time)
              skipNextEndClear.current = value === ''
              setBookingDate('end', value)
            }}
          />
        )}
      </div>

      <p className={cn('text-sm font-semibold', isAvailabilityLoading || isAvailabilityError ? 'text-[#52627d]' : 'text-[#16a34a]')}>
        {isAvailabilityLoading ? 'Checking vehicle availability...' : isAvailabilityError ? 'Availability will be confirmed when you submit.' : 'Available for selected dates'}
      </p>
    </>
  )
}
