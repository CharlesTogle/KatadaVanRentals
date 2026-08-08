import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CustomerShellFrame } from '@/components/customer-shell-frame'
import { LocationSelector } from '@/components/booking/location-selector'
import { useAvailableVehicleIds, useVehicles } from '@/hooks/use-vehicles'
import { AppHeader } from '@/components/app-header'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { isAdminRole } from '@/lib/rbac'
import { loadBookingDateSelection, saveBookingDateSelection } from '@/lib/booking-date-storage'
import { useBookingStore } from '@/store/booking-store'
import { Button } from '@/components/ui/button'
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
  const [availableVehicleIds, setAvailableVehicleIds] = useState<string[] | null>(savedSelection?.availableVehicleIds || null)
  const [availabilityError, setAvailabilityError] = useState('')

  const { data: vehicles = [], isLoading } = useVehicles()
  const { mutateAsync: findAvailableVehicleIds, isPending: isCheckingAvailability } = useAvailableVehicleIds()
  const inCustomerShell = !!user && !isAdminRole(profile?.role)

  const updateBookingDates = (next: { start?: string; end?: string }) => {
    const selection = {
      start: next.start ?? mergeDateTimeValue(startDatePart, startTimePart),
      end: next.end ?? mergeDateTimeValue(endDatePart, endTimePart),
    }

    setAvailableVehicleIds(null)
    setAvailabilityError('')
    saveBookingDateSelection({ ...selection, availableVehicleIds: [] })
  }

  const applyFilters = async () => {
    const nextDropoff = returnToDifferentLocation ? locations.dropoff : locations.pickup
    setLocations({ pickup: locations.pickup, dropoff: nextDropoff })

    const startAt = mergeDateTimeValue(startDatePart, startTimePart)
    const endAt = mergeDateTimeValue(endDatePart, endTimePart)
    setAvailabilityError('')

    try {
      const nextAvailableVehicleIds = startAt && endAt
        ? await findAvailableVehicleIds({ startAt, endAt })
        : vehicles.map((vehicle) => vehicle.id)
      setAvailableVehicleIds(nextAvailableVehicleIds)
      saveBookingDateSelection({ start: startAt, end: endAt, availableVehicleIds: nextAvailableVehicleIds })
    } catch {
      setAvailableVehicleIds([])
      setAvailabilityError('We could not check vehicle availability. Please try again.')
      return
    }

    const rows = [
      buildResultRow('Pick up', locations.pickup, startDatePart, startTimePart),
      buildResultRow('Drop off', nextDropoff, endDatePart, endTimePart),
    ].filter(Boolean) as Array<{ label: string; value: string }>

    setAppliedFiltersRows(rows)
  }

  const content = (
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-black tracking-[-0.03em] text-[#071f52] sm:text-4xl sm:tracking-[-0.04em]">Browse Vehicles</h1>
        <p className="mt-1.5 text-xs font-medium leading-6 text-[#071f52]/68 sm:mt-3 sm:text-base sm:leading-7">Find the perfect vehicle for your trip</p>
      </div>

      <div className="mb-6 rounded-lg border border-[#071f52]/10 bg-white p-4 shadow-[0_8px_24px_rgba(7,31,82,0.06)] sm:mb-10 sm:rounded-[24px] sm:p-6 sm:shadow-[0_12px_40px_rgba(7,31,82,0.08)]">
        <div
          className={returnToDifferentLocation
            ? 'grid gap-2 sm:grid-cols-2 sm:gap-3'
            : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.9fr)] lg:items-end sm:gap-3 lg:gap-3'}
        >
          <div
            className={returnToDifferentLocation
              ? 'space-y-1.5 [&_label]:text-[10px] [&_label]:font-bold [&_label]:text-[#071f52] sm:space-y-2 sm:[&_label]:text-xs'
              : 'space-y-1.5 [&_label]:flex [&_label]:items-end [&_label]:text-[10px] [&_label]:font-bold [&_label]:whitespace-nowrap sm:space-y-2 sm:[&_label]:min-h-[2rem] sm:[&_label]:text-[11px]'}
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
          {returnToDifferentLocation ? <div className="space-y-1.5 [&_label]:text-[10px] [&_label]:font-bold [&_label]:text-[#071f52] sm:space-y-2 sm:[&_label]:text-xs">
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
            labelClassName={returnToDifferentLocation ? 'text-[10px] font-bold text-[#071f52] sm:text-xs' : 'text-[10px] font-bold text-[#071f52] sm:text-[11px]'}
            triggerClassName={returnToDifferentLocation ? 'min-h-[44px] text-xs text-[#071f52] sm:min-h-[48px] sm:text-sm' : 'min-h-[44px] text-xs text-[#071f52] sm:min-h-[48px] sm:text-sm'}
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
            labelClassName={returnToDifferentLocation ? 'text-[10px] font-bold text-[#071f52] sm:text-xs' : 'text-[10px] font-bold text-[#071f52] sm:text-[11px]'}
            triggerClassName={returnToDifferentLocation ? 'min-h-[44px] text-xs text-[#071f52] sm:min-h-[48px] sm:text-sm' : 'min-h-[44px] text-xs text-[#071f52] sm:min-h-[48px] sm:text-sm'}
            onChange={(value) => {
              const nextEnd = splitDateTimeValue(value)
              setEndDatePart(nextEnd.date)
              setEndTimePart(nextEnd.time)
              updateBookingDates({ end: value })
            }}
          />
          {!returnToDifferentLocation ? (
            <div className="flex items-end">
               <Button type="button" onClick={applyFilters} disabled={isCheckingAvailability} className="h-[44px] w-full gap-1.5 rounded-lg bg-[#e92935] text-xs text-white hover:bg-[#c91f2a] sm:h-[50px] sm:gap-2 sm:rounded-2xl">
                <Search size={14} className="sm:hidden" />
                <Search size={16} className="hidden sm:block" />
                Find a Car
              </Button>
            </div>
          ) : null}
        </div>
        <label className="mt-3 inline-flex w-full items-center justify-start gap-1.5 text-xs font-bold text-[#071f52]/70 sm:mt-4 sm:gap-2 sm:text-sm">
          <input
            type="checkbox"
            checked={returnToDifferentLocation}
            onChange={(e) => {
              setReturnToDifferentLocation(e.target.checked)
              setLocations({ dropoff: e.target.checked ? locations.dropoff : locations.pickup })
            }}
            className="h-3.5 w-3.5 rounded border border-[#071f52]/20 accent-[#071f52] sm:h-4 sm:w-4"
          />
          Return to a different location
        </label>
        {returnToDifferentLocation ? (
          <div className="mt-3 sm:mt-4">
            <div className="flex items-end">
               <Button type="button" onClick={applyFilters} disabled={isCheckingAvailability} className="h-[44px] w-full gap-1.5 rounded-lg bg-[#e92935] text-xs text-white hover:bg-[#c91f2a] sm:h-[50px] sm:gap-2 sm:rounded-2xl">
                <Search size={14} className="sm:hidden" />
                <Search size={16} className="hidden sm:block" />
                Find a Car
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {appliedFiltersRows.length ? (
        <div className="-mt-4 mb-6 rounded-lg border border-[#071f52]/10 bg-white/70 px-3 py-2.5 text-xs font-semibold text-[#071f52]/78 sm:-mt-5 sm:mb-8 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
          <p className="font-bold text-[#071f52] text-xs sm:text-sm">Showing results for:</p>
          <table className="mt-1.5 w-full border-separate border-spacing-y-0.5 sm:mt-2 sm:border-spacing-y-1">
            <tbody>
              {appliedFiltersRows.map((row) => (
                <tr key={row.label}>
                  <th className="w-[80px] pr-2 text-left align-top font-bold text-[#071f52] text-xs sm:w-[92px] sm:pr-3">{row.label}:</th>
                  <td className="text-[#071f52]/78 text-xs sm:text-sm">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {availabilityError ? <p className="mb-4 text-sm font-semibold text-[#b91c1c]">{availabilityError}</p> : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-[#071f52]/10 bg-white p-0 sm:rounded-[28px]">
              <div className="aspect-[4/3] w-full rounded-t-lg bg-[#071f52]/10 sm:rounded-t-[28px]" />
              <div className="space-y-2 p-4 sm:space-y-3 sm:p-5">
                <div className="h-4 w-3/4 rounded bg-[#071f52]/10 sm:h-5" />
                <div className="h-3 w-full rounded bg-[#071f52]/8 sm:h-4" />
                <div className="h-6 rounded bg-[#071f52]/6 sm:h-8" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
           {vehicles.filter((vehicle) => availableVehicleIds === null || availableVehicleIds.includes(vehicle.id)).map((v) => {
            const image = v.image_paths?.[0] || '/van-1.jpg'
            return (
              <article
                key={v.id}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(7,31,82,0.1)] sm:rounded-[28px] sm:shadow-[0_14px_40px_rgba(7,31,82,0.08)] sm:hover:shadow-[0_20px_50px_rgba(7,31,82,0.14)]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={image}
                    alt={v.name}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[#071f52] px-2.5 py-1 text-[10px] font-bold text-white sm:left-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-xs">
                    Available
                  </span>
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-[#ffd923]/90 px-2.5 py-1 text-[10px] font-bold text-[#071f52] sm:right-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-xs">
                    Van
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-6">
                  <h3 className="text-sm font-black tracking-[-0.02em] text-[#071f52] sm:text-xl sm:tracking-[-0.03em]">{v.name}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                    {['Aircon', `${v.passenger_count} Seats`, 'Diesel'].map((f) => (
                      <span key={f} className="rounded-full bg-[#071f52]/8 px-2 py-0.5 text-[10px] font-bold text-[#071f52]/66 sm:px-3 sm:py-1 sm:text-[11px]">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-[#071f52]/48 sm:mt-3 sm:text-xs">Self-Drive & Driver</p>
                  <div className="mt-auto flex items-center justify-between border-t border-[#071f52]/8 pt-3 sm:pt-4">
                    <div>
                      <span className="text-base font-black tracking-[-0.02em] text-[#071f52] sm:text-2xl sm:tracking-[-0.03em]">₱{v.base_price_per_day.toLocaleString()}</span>
                      <span className="text-xs font-bold text-[#071f52]/48 sm:text-sm">/day</span>
                    </div>
                    <Button asChild size="sm" className="gap-1 bg-[#071f52] text-xs text-white hover:bg-[#112458] sm:gap-1.5">
                      <Link to={`/our-fleet/${v.slug}`}>
                        View <ArrowRight size={12} className="sm:hidden" />
                        <ArrowRight size={14} className="hidden sm:block" />
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

  return inCustomerShell ? <CustomerShellFrame>{content}</CustomerShellFrame> : <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}><AppHeader /><div className="mx-auto max-w-[1180px]">{content}</div></div>
}
