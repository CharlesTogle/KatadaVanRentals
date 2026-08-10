import { useMemo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
const PERIODS = ['AM', 'PM'] as const

interface DateTimePickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  inlineLabel?: boolean
  labelClassName?: string
  triggerClassName?: string
  disabled?: boolean
  minDateTime?: Date
  disabledDates?: Date[] | ((date: Date) => boolean)
}

function parseDateTimeValue(value: string) {
  if (!value) return undefined

  const [datePart = '', timePart = ''] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.slice(0, 5).split(':').map(Number)

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return undefined
  }

  const nextDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return Number.isNaN(nextDate.getTime()) ? undefined : nextDate
}

function formatDateTimeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function buildDateTime(date: Date, hour: string, minute: string, period: string) {
  const hourNumber = Number(hour) % 12
  const hours24 = period === 'PM' ? hourNumber + 12 : hourNumber
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours24, Number(minute), 0, 0)
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  inlineLabel = false,
  labelClassName,
  triggerClassName,
  disabled = false,
  minDateTime,
  disabledDates = [],
}: DateTimePickerProps) {
  const selectedDate = useMemo(() => parseDateTimeValue(value), [value])
  const timeParts = useMemo(() => {
    if (!selectedDate) {
      return { hour: '12', minute: '00', period: 'PM' as (typeof PERIODS)[number] }
    }

    const hours = selectedDate.getHours()
    const hour12 = hours % 12 || 12
    return {
      hour: String(hour12).padStart(2, '0'),
      minute: String(selectedDate.getMinutes()).padStart(2, '0'),
      period: hours >= 12 ? 'PM' : 'AM',
    }
  }, [selectedDate])

  const displayValue = selectedDate ? format(selectedDate, "MMM d, yyyy 'at' h:mm aa") : placeholder
  const disabledDay = (date: Date) => (
    (minDateTime ? date < minDateTime : false)
    || (typeof disabledDates === 'function'
      ? disabledDates(date)
      : disabledDates.some((disabledDate) => (
        date.getFullYear() === disabledDate.getFullYear()
        && date.getMonth() === disabledDate.getMonth()
        && date.getDate() === disabledDate.getDate()
      )))
  )

  const updateValue = (nextDate: Date) => {
    onChange(formatDateTimeValue(nextDate))
  }

  const handleDateSelect = (nextDate: Date | undefined) => {
    if (!nextDate) {
      onChange('')
      return
    }

    updateValue(buildDateTime(nextDate, timeParts.hour, timeParts.minute, timeParts.period))
  }

  const handleTimeChange = (type: 'hour' | 'minute' | 'period', nextValue: string) => {
    const baseDate = selectedDate ?? new Date()
    const dateOnly = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0)
    const nextHour = type === 'hour' ? nextValue : timeParts.hour
    const nextMinute = type === 'minute' ? nextValue : timeParts.minute
    const nextPeriod = type === 'period' ? (nextValue as (typeof PERIODS)[number]) : timeParts.period
    updateValue(buildDateTime(dateOnly, nextHour, nextMinute, nextPeriod))
  }

  return (
    <div className="space-y-1.5">
      <input
        id={`${id}-input`}
        type="text"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
      />
      {!inlineLabel ? (
        <label htmlFor={`${id}-input`} className={cn('text-sm font-bold text-[#071f52]', labelClassName)}>
          {label}
          {required ? <span className="text-[#e92935]"> *</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              id={id}
              type="button"
              disabled={disabled}
              className={cn(
                'flex min-h-[52px] w-full items-center rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-left text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60 disabled:cursor-not-allowed disabled:opacity-60',
                inlineLabel ? 'min-h-[62px] items-start justify-center' : '',
                !selectedDate ? 'text-[#071f52]/38' : '',
                triggerClassName,
                selectedDate ? 'pr-11' : '',
              )}
            >
              {inlineLabel ? (
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={cn('text-[11px] font-bold uppercase tracking-[0.02em] text-[#071f52]/38', labelClassName)}>
                    {label}
                  </span>
                  <span className={cn('block truncate text-sm font-semibold', !selectedDate ? 'text-[#071f52]/38' : 'text-[#071f52]')}>
                    {displayValue}
                  </span>
                </span>
              ) : (
                <span className={cn('block truncate', !selectedDate ? 'text-[#071f52]/38' : 'text-[#071f52]')}>
                  {displayValue}
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={8}
              className="z-50 w-[340px] rounded-[20px] border border-[#071f52]/12 bg-white p-0 shadow-[0_22px_60px_rgba(7,31,82,0.18)] outline-none"
            >
              <div className="[--rdp-accent-color:#5b9cff] [--rdp-accent-background-color:#eaf2ff] [--rdp-day_button-border-radius:9999px] [--rdp-day-height:40px] [--rdp-day-width:40px] [--rdp-nav_button-height:32px] [--rdp-nav_button-width:32px] [--rdp-animation_duration:0s]">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  showOutsideDays
                  fixedWeeks
                  disabled={disabledDay}
                  className="p-3"
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-0 border-t border-[#071f52]/10 bg-[#f7f9ff] px-3 py-3">
              <div>
                <label htmlFor={`${id}-hour`} className="sr-only">{label} hour</label>
                <select
                  id={`${id}-hour`}
                  value={timeParts.hour}
                  onChange={(event) => handleTimeChange('hour', event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#071f52]/10 bg-white px-3 text-center text-base font-semibold text-[#071f52] focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
              </div>
              <span className="text-center text-lg font-black text-[#071f52]/48">:</span>
              <div>
                <label htmlFor={`${id}-minute`} className="sr-only">{label} minute</label>
                <select
                  id={`${id}-minute`}
                  value={timeParts.minute}
                  onChange={(event) => handleTimeChange('minute', event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#071f52]/10 bg-white px-3 text-center text-base font-semibold text-[#071f52] focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                >
                  {MINUTES.map((minute) => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-period`} className="sr-only">{label} AM PM</label>
                <select
                  id={`${id}-period`}
                  value={timeParts.period}
                  onChange={(event) => handleTimeChange('period', event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#071f52]/10 bg-white px-3 text-center text-base font-semibold text-[#071f52] focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                >
                  {PERIODS.map((period) => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {selectedDate && !disabled ? (
          <button
            type="button"
            aria-label="Clear date and time"
            title="Clear date and time"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1.5 text-[#071f52]/48 transition-colors hover:bg-[#071f52]/8 hover:text-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
