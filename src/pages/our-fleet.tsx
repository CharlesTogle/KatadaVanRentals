import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CustomerShellFrame } from '@/components/customer-shell-frame'
import { LocationSelector } from '@/components/booking/location-selector'
import { useVehicles } from '@/hooks/use-vehicles'
import { AppHeader } from '@/components/app-header'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { isAdminRole } from '@/lib/rbac'
import { loadBookingDateSelection, saveBookingDateSelection } from '@/lib/booking-date-storage'
import { useBookingStore } from '@/store/booking-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Search, ArrowRight } from 'lucide-react'

function splitDateTimeValue(value: string) {
  if (!value) return { date: '', time: '' }

  const [date = '', rawTime = ''] = value.split('T')
  return { date, time: rawTime.slice(0, 5) }
}

function mergeDateTimeValue(date: string, time: string) {
  if (!date || !time) return ''

  return `${date}T${time}`
}

function addHoursToDateTimeValue(value: string, hours: number) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  date.setHours(date.getHours() + hours)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatFilterDateTime(date: string, time: string) {
  if (!date && !time) return ''
  if (!date) return time
  if (!time) return date

  const value = new Date(`${date}T${time}`)
  if (Number.isNaN(value.getTime())) return `${date} ${time}`

  const formattedDate = value.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${formattedDate} ${formattedTime}`
}

function buildResultRow(label: string, location: string, date: string, time: string) {
  const formattedDateTime = formatFilterDateTime(date, time)
  const value = [location, formattedDateTime].filter(Boolean).join(', ')
  return value ? { label, value } : null
}

export default function OurFleet() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const savedSelection = loadBookingDateSelection()
  const initialStart = splitDateTimeValue(savedSelection?.start || '')
  const initialEnd = splitDateTimeValue(savedSelection?.end || '')
  const locations = useBookingStore((s) => s.locations)
  const setLocations = useBookingStore((s) => s.setLocations)
  const setRouteSelection = useBookingStore((s) => s.setRouteSelection)
  const [returnToDifferentLocation, setReturnToDifferentLocation] = useState(
    Boolean(locations.pickup && locations.dropoff && locations.dropoff !== locations.pickup),
  )
  const [startDatePart, setStartDatePart] = useState(initialStart.date)
  const [startTimePart, setStartTimePart] = useState(initialStart.time)
  const [endDatePart, setEndDatePart] = useState(initialEnd.date)
  const [endTimePart, setEndTimePart] = useState(initialEnd.time)
  const [appliedFiltersRows, setAppliedFiltersRows] = useState<Array<{ label: string; value: string }>>([])

  const { data: vehicles = [], isLoading } = useVehicles()
  const inCustomerShell = !!user && !isAdminRole(profile?.role)

  const updateBookingDates = (next: { start?: string; end?: string }) => {
    const selection = {
      start: next.start ?? mergeDateTimeValue(startDatePart, startTimePart),
      end: next.end ?? mergeDateTimeValue(endDatePart, endTimePart),
    }

    saveBookingDateSelection(selection)
  }

  const applyFilters = () => {
    const nextDropoff = returnToDifferentLocation ? locations.dropoff : locations.pickup
    setLocations({ pickup: locations.pickup, dropoff: nextDropoff })

    const rows = [
      buildResultRow('Pick up', locations.pickup, startDatePart, startTimePart),
      buildResultRow('Drop off', nextDropoff, endDatePart, endTimePart),
    ].filter(Boolean) as Array<{ label: string; value: string }>

    setAppliedFiltersRows(rows)
  }

  const content = (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Browse Vehicles</h1>
        <p className="mt-3 text-base font-medium leading-7 text-[#071f52]/68">Find the perfect vehicle for your trip</p>
      </div>

      <div className="mb-10 rounded-[24px] border border-[#071f52]/10 bg-white p-5 shadow-[0_12px_40px_rgba(7,31,82,0.08)] sm:p-6">
        <div
          className={returnToDifferentLocation
            ? 'grid gap-3 sm:grid-cols-2'
            : 'grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(180px,0.9fr)] lg:items-end'}
        >
          <div
            className={returnToDifferentLocation
              ? 'space-y-2 [&_label]:text-xs [&_label]:font-bold [&_label]:text-[#071f52]'
              : 'space-y-2 [&_label]:flex [&_label]:min-h-[2rem] [&_label]:items-end [&_label]:text-[11px] [&_label]:whitespace-nowrap'}
          >
            <LocationSelector
              id="fleet-pickup"
              label={returnToDifferentLocation ? 'PICK-UP LOCATION' : 'PICK-UP AND DROP-OFF LOCATION'}
              value={locations.pickup}
              placeholder="Where to deliver?"
              onChange={(value) => setLocations({ pickup: value, dropoff: returnToDifferentLocation ? locations.dropoff : value })}
              onSelect={(selection) => {
                setRouteSelection('pickup', selection)
                if (!returnToDifferentLocation) {
                  setRouteSelection('dropoff', selection)
                }
              }}
            />
          </div>
          {returnToDifferentLocation ? <div className="space-y-2 [&_label]:text-xs [&_label]:font-bold [&_label]:text-[#071f52]">
            <LocationSelector
              id="fleet-dropoff"
              label="DROP-OFF LOCATION"
              value={locations.dropoff}
              placeholder="Return location"
              readOnly={false}
              onChange={(value) => setLocations({ dropoff: value })}
              onSelect={(selection) => setRouteSelection('dropoff', selection)}
            />
          </div> : null}
          <DateTimePicker
            id="fleet-start-at"
            label="PICK-UP DATE & TIME"
            value={mergeDateTimeValue(startDatePart, startTimePart)}
            placeholder="Select date & time"
            labelClassName={returnToDifferentLocation ? 'text-xs font-bold text-[#071f52]' : 'text-[11px] font-bold text-[#071f52]'}
            triggerClassName={returnToDifferentLocation ? 'min-h-[48px] text-sm text-[#071f52]' : 'min-h-[48px] text-sm text-[#071f52]'}
            onChange={(value) => {
              const nextStart = splitDateTimeValue(value)
              const nextEnd = addHoursToDateTimeValue(value, 24)
              setStartDatePart(nextStart.date)
              setStartTimePart(nextStart.time)
              if (nextEnd) {
                const splitEnd = splitDateTimeValue(nextEnd)
                setEndDatePart(splitEnd.date)
                setEndTimePart(splitEnd.time)
              } else {
                setEndDatePart('')
                setEndTimePart('')
              }
              updateBookingDates({ start: value, end: nextEnd })
            }}
          />
          <DateTimePicker
            id="fleet-end-at"
            label="DROP-OFF DATE & TIME"
            value={mergeDateTimeValue(endDatePart, endTimePart)}
            placeholder="Select date & time"
            labelClassName={returnToDifferentLocation ? 'text-xs font-bold text-[#071f52]' : 'text-[11px] font-bold text-[#071f52]'}
            triggerClassName={returnToDifferentLocation ? 'min-h-[48px] text-sm text-[#071f52]' : 'min-h-[48px] text-sm text-[#071f52]'}
            onChange={(value) => {
              const nextEnd = splitDateTimeValue(value)
              setEndDatePart(nextEnd.date)
              setEndTimePart(nextEnd.time)
              updateBookingDates({ end: value })
            }}
          />
          {!returnToDifferentLocation ? (
            <div className="flex items-end">
              <Button type="button" onClick={applyFilters} className="h-[50px] w-full gap-2 rounded-2xl bg-[#e92935] text-white hover:bg-[#c91f2a]">
                <Search size={16} /> Find a Car
              </Button>
            </div>
          ) : null}
        </div>
        <label className="mt-4 inline-flex w-full items-center justify-start gap-2 text-sm font-bold text-[#071f52]/70">
          <input
            type="checkbox"
            checked={returnToDifferentLocation}
            onChange={(e) => {
              setReturnToDifferentLocation(e.target.checked)
              setLocations({ dropoff: e.target.checked ? locations.dropoff : locations.pickup })
            }}
            className="h-4 w-4 rounded border border-[#071f52]/20 accent-[#071f52]"
          />
          Return to a different location
        </label>
        {returnToDifferentLocation ? (
          <div className="mt-4">
            <div className="flex items-end">
              <Button type="button" onClick={applyFilters} className="h-[50px] w-full gap-2 rounded-2xl bg-[#e92935] text-white hover:bg-[#c91f2a]">
                <Search size={16} /> Find a Car
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {appliedFiltersRows.length ? (
        <div className="-mt-5 mb-8 rounded-2xl border border-[#071f52]/10 bg-white/70 px-4 py-3 text-sm font-semibold text-[#071f52]/78">
          <p className="font-bold text-[#071f52]">Showing results for:</p>
          <table className="mt-2 w-full border-separate border-spacing-y-1">
            <tbody>
              {appliedFiltersRows.map((row) => (
                <tr key={row.label}>
                  <th className="w-[92px] pr-3 text-left align-top font-bold text-[#071f52]">{row.label}:</th>
                  <td className="text-[#071f52]/78">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-[28px] border border-[#071f52]/10 bg-white p-0">
              <div className="aspect-[4/3] w-full rounded-t-[28px] bg-[#071f52]/10" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded-lg bg-[#071f52]/10" />
                <div className="h-4 w-full rounded-lg bg-[#071f52]/8" />
                <div className="h-8 rounded-lg bg-[#071f52]/6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const image = v.image_paths?.[0] || '/van-1.jpg'
            return (
              <article
                key={v.id}
                className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#071f52]/10 bg-white shadow-[0_14px_40px_rgba(7,31,82,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(7,31,82,0.14)]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={image}
                    alt={v.name}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <Badge className="absolute left-3 top-3 rounded-full bg-[#071f52] px-3 py-1.5 text-xs font-bold text-white">
                    Available
                  </Badge>
                  <Badge className="absolute right-3 top-3 rounded-full bg-[#ffd923]/90 px-3 py-1.5 text-xs font-bold text-[#071f52]">
                    Van
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="text-xl font-black tracking-[-0.03em] text-[#071f52]">{v.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Aircon', `${v.passenger_count} Seats`, 'Diesel'].map((f) => (
                      <span key={f} className="rounded-full bg-[#071f52]/8 px-3 py-1 text-[11px] font-bold text-[#071f52]/66">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#071f52]/48">Self-Drive & Driver</p>
                  <div className="mt-auto flex items-center justify-between border-t border-[#071f52]/8 pt-4">
                    <div>
                      <span className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">₱{v.base_price_per_day.toLocaleString()}</span>
                      <span className="text-sm font-bold text-[#071f52]/48">/day</span>
                    </div>
                    <Button asChild className="gap-1.5 bg-[#071f52] text-white hover:bg-[#112458]">
                      <Link to={`/our-fleet/${v.slug}`}>
                        View <ArrowRight size={14} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )

  return inCustomerShell ? <CustomerShellFrame>{content}</CustomerShellFrame> : <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}><AppHeader />{content}</div>
}
