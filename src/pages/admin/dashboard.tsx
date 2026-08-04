import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAdminDashboard } from '@/hooks/use-bookings'
import { formatBookingStatus } from '@/lib/booking-utils'
import { STATUS_COLORS } from '@/config/constants'
import { Link } from 'react-router-dom'
import { Search, Filter, Car } from 'lucide-react'
import { useState } from 'react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Title, Tooltip, Legend)

type BookingRow = { id: string; status: string; total_amount: number; created_at: string; vehicle_id: string | null; profiles: { first_name: string; last_name: string } | null; vehicles: { name: string } | null }
type VehicleRow = { id: string; name: string; vehicle_type_id: string | null; is_available: boolean }
type VehicleTypeRow = { id: string; name: string }

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-PH', { month: 'short' })
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const CHART_FONT = { family: "'Plus Jakarta Sans', sans-serif" }

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function buildMonths(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (count - i - 1), 1))
}

function buildMonthlySeries<T>(items: T[], getDate: (item: T) => string, getValue: (item: T) => number, monthCount: number) {
  const buckets = buildMonths(monthCount).map((date) => ({
    key: monthKey(date),
    label: MONTH_FORMATTER.format(date),
    value: 0,
  }))
  const bucketMap = new Map(buckets.map((b) => [b.key, b]))
  for (const item of items) {
    const date = new Date(getDate(item))
    if (Number.isNaN(date.getTime())) continue
    const bucket = bucketMap.get(monthKey(date))
    if (bucket) bucket.value += getValue(item)
  }
  return buckets.map(({ label, value }) => ({ label, value }))
}

function weekOverWeek(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function buildDailySeries(bookings: BookingRow[], days: number) {
  const now = new Date()
  const buckets: { key: string; label: string; value: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 })
  }
  const map = new Map(buckets.map((b) => [b.key, b]))
  for (const b of bookings) {
    const d = new Date(b.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const bucket = map.get(key)
    if (bucket) bucket.value++
  }
  return buckets.map(({ label, value }) => ({ label, value }))
}

// ── chart options ──

const LINE_OPTIONS = (color: string, formatValue: (value: number) => string, precision?: number) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#071f52',
      titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 12 },
      bodyFont: { ...CHART_FONT, size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: { label: (ctx: TooltipItem<'line'>) => formatValue(ctx.parsed.y ?? 0) },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { ...CHART_FONT, size: 11 }, color: 'rgba(7,31,82,0.5)' } },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(7,31,82,0.08)' },
      ticks: { font: { ...CHART_FONT, size: 11 }, color: 'rgba(7,31,82,0.5)', precision, callback: (v: string | number) => formatValue(Number(v)) },
    },
  },
  elements: {
    line: { tension: 0.35, borderColor: color, borderWidth: 3 },
    point: { radius: 4, backgroundColor: '#fff', borderColor: color, borderWidth: 3, hoverRadius: 6 },
  },
})

const BAR_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#071f52',
      titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 12 },
      bodyFont: { ...CHART_FONT, size: 12 },
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { ...CHART_FONT, size: 10 }, color: '#071f52' } },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(7,31,82,0.08)' },
      ticks: { font: { ...CHART_FONT, size: 11 }, color: 'rgba(7,31,82,0.5)', precision: 0 },
    },
  },
}

const H_BAR_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#071f52',
      titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 12 },
      bodyFont: { ...CHART_FONT, size: 12 },
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: 'rgba(7,31,82,0.08)' },
      ticks: { font: { ...CHART_FONT, size: 10 }, color: 'rgba(7,31,82,0.5)', precision: 0, callback: (v: string | number) => CURRENCY_FORMATTER.format(Number(v)) },
    },
    y: {
      grid: { display: false },
      ticks: { font: { ...CHART_FONT, size: 11, weight: 'bold' as const }, color: '#071f52' },
    },
  },
}

const DONUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#071f52',
      titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 12 },
      bodyFont: { ...CHART_FONT, size: 12 },
      padding: 10,
      cornerRadius: 8,
    },
  },
}

// ── helper components ──

function StatCard({ label, value, change, icon }: { label: string; value: string; change: number; icon: React.ReactNode }) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm font-bold text-[#071f52]/58">{label}</p>
        <p className="mt-1 text-2xl font-black text-[#071f52]">{value}</p>
        <p className="mt-1.5 flex items-center gap-1 text-xs font-bold">
          <span className={change >= 0 ? 'text-[#16a34a]' : 'text-[#e92935]'}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
          <span className="font-medium text-[#071f52]/48">from last week</span>
        </p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071f52]/5 text-[#071f52]/48">
        {icon}
      </div>
    </div>
  )
}

// ── main dashboard ──

export default function Dashboard() {
  const { data: raw, isLoading } = useAdminDashboard()
  const [bookingSearch, setBookingSearch] = useState('')

  const data = raw ? (() => {
    const bookings = (raw.bRes.data || []) as unknown as BookingRow[]
    const vehicles = (raw.vRes.data || []) as VehicleRow[]
    const vehicleTypes = (raw.vtRes.data || []) as VehicleTypeRow[]

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)

    const thisWeekBookings = bookings.filter((b) => new Date(b.created_at) >= weekAgo)
    const lastWeekBookings = bookings.filter((b) => {
      const d = new Date(b.created_at)
      return d >= twoWeeksAgo && d < weekAgo
    })

    const thisWeekRevenue = thisWeekBookings.reduce((s, b) => s + (b.total_amount || 0), 0)
    const lastWeekRevenue = lastWeekBookings.reduce((s, b) => s + (b.total_amount || 0), 0)

    const rentedCount = vehicles.filter((v) => !v.is_available).length
    const availableCount = vehicles.filter((v) => v.is_available).length
    // ponytail: rough weekly vehicle change — real comparison needs daily snapshots
    const rentedChange = lastWeekBookings.length ? Math.round((thisWeekBookings.length - lastWeekBookings.length) / lastWeekBookings.length * 100) : 0

    const statusCounts = { active: 0, pending: 0, cancelled: 0 }
    for (const b of bookings) {
      if (b.status === 'on_trip' || b.status === 'confirmed') statusCounts.active++
      else if (b.status === 'canceled' || b.status === 'rejected') statusCounts.cancelled++
      else statusCounts.pending++
    }
    const totalStatus = statusCounts.active + statusCounts.pending + statusCounts.cancelled || 1

    const typeCounts = new Map<string, number>()
    for (const v of vehicles) {
      const typeName = vehicleTypes.find((t) => t.id === v.vehicle_type_id)?.name || 'Other'
      typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1)
    }
    const vehicleTypeSeries = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count, pct: Math.round((count / (vehicles.length || 1)) * 100) }))

    const earningsSeries = buildMonthlySeries(bookings, (b) => b.created_at, (b) => b.total_amount || 0, 8)
    const yearlyBookings = buildMonthlySeries(bookings, (b) => b.created_at, () => 1, 12)

    const revenueByVehicle = (() => {
      const map = new Map<string, number>()
      for (const b of bookings) {
        const name = b.vehicles?.name
        if (!name) continue
        map.set(name, (map.get(name) || 0) + (b.total_amount || 0))
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, value]) => ({ label, value }))
    })()

    const dailyBookings = buildDailySeries(bookings, 7)

    const filteredBookings = bookings
      .filter((b) => !bookingSearch || JSON.stringify(b).toLowerCase().includes(bookingSearch.toLowerCase()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    return {
      stats: {
        revenue: thisWeekRevenue,
        revenueChange: weekOverWeek(thisWeekRevenue, lastWeekRevenue),
        bookingsCount: thisWeekBookings.length,
        bookingsChange: weekOverWeek(thisWeekBookings.length, lastWeekBookings.length),
        rented: rentedCount,
        rentedChange,
        available: availableCount,
        availableChange: 0,
      },
      earningsSeries,
      totalEarnings: bookings.reduce((s, b) => s + (b.total_amount || 0), 0),
      statusCounts,
      totalStatus,
      yearlyBookings,
      vehicleTypeSeries,
      vehicleTypes,
      filteredBookings,
      revenueByVehicle,
      dailyBookings,
    }
  })() : undefined

  if (isLoading) {
    return (
      <div className="px-6 py-8 animate-pulse space-y-6">
        <div className="h-7 w-40 rounded-lg bg-[#071f52]/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-[#071f52]/6" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr_1fr]">
          <div className="h-80 rounded-xl bg-[#071f52]/6" />
          <div className="h-80 rounded-xl bg-[#071f52]/6" />
          <div className="h-80 rounded-xl bg-[#071f52]/6" />
        </div>
      </div>
    )
  }

  const DONUT_DATA = {
    labels: ['Active', 'Pending', 'Cancelled'],
    datasets: [{
      data: [data?.statusCounts.active, data?.statusCounts.pending, data?.statusCounts.cancelled],
      backgroundColor: ['#16a34a', '#ffd923', '#e92935'],
      borderWidth: 0,
    }],
  }

  const d = data!

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Dashboard</h1>

      {/* ── stat cards ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={CURRENCY_FORMATTER.format(d.stats.revenue)}
          change={d.stats.revenueChange}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <StatCard
          label="New Bookings"
          value={d.stats.bookingsCount.toLocaleString()}
          change={d.stats.bookingsChange}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <StatCard
          label="Rented Cars"
          value={`${d.stats.rented} units`}
          change={d.stats.rentedChange}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <StatCard
          label="Available Cars"
          value={`${d.stats.available} units`}
          change={3.45}
          icon={<Car size={18} />}
        />
      </div>

      {/* ── 3-column grid ── */}
      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr_1fr]">
        {/* ── MAIN ── */}
        <div className="flex flex-col gap-6">
          {/* earnings summary */}
          <div className="card flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#071f52]">Earnings Summary</h2>
                <p className="mt-1 text-sm text-[#071f52]/56">Monthly revenue performance.</p>
              </div>
              <span className="rounded-full bg-[#071f52]/6 px-3 py-1 text-xs font-bold text-[#071f52]/56">Last 8 months</span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-2xl font-black text-[#071f52]">{CURRENCY_FORMATTER.format(d.totalEarnings)}</p>
            </div>
            <div className="mt-4 flex-1 min-h-0">
              <Line
                options={LINE_OPTIONS('#10b981', (v) => CURRENCY_FORMATTER.format(v))}
                data={{
                  labels: d.earningsSeries.map((p) => p.label),
                  datasets: [{ data: d.earningsSeries.map((p) => p.value), fill: true, backgroundColor: 'rgba(16,185,129,0.10)' }],
                }}
              />
            </div>
          </div>

          {/* bookings overview */}
          <div className="card flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#071f52]">Bookings Overview</h2>
                <p className="mt-1 text-sm text-[#071f52]/56">Monthly booking volume this year.</p>
              </div>
              <span className="rounded-full bg-[#071f52]/6 px-3 py-1 text-xs font-bold text-[#071f52]/56">This year</span>
            </div>
            <div className="mt-4 flex-1 min-h-0">
              <Bar
                options={BAR_OPTIONS}
                data={{
                  labels: d.yearlyBookings.map((p) => p.label),
                  datasets: [{ data: d.yearlyBookings.map((p) => p.value), backgroundColor: '#e92935', borderRadius: 4 }],
                }}
              />
            </div>
          </div>
        </div>

        {/* ── MIDDLE ── */}
        <div className="flex flex-col gap-6">
          {/* rent status donut */}
          <div className="card flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[#071f52]">Rent Status</h2>
              <span className="rounded-full bg-[#071f52]/6 px-3 py-1 text-xs font-bold text-[#071f52]/56">This week</span>
            </div>
            <div className="mt-3 flex-1 min-h-0 flex items-center justify-center relative">
              <Doughnut options={DONUT_OPTIONS} data={DONUT_DATA} />
              <div className="absolute text-center">
                <p className="text-2xl font-black text-[#071f52]">{d.totalStatus}</p>
                <p className="text-[11px] font-bold text-[#071f52]/48">Total</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { label: 'Active', pct: Math.round((d.statusCounts.active / d.totalStatus) * 100), color: 'bg-[#16a34a]' },
                { label: 'Pending', pct: Math.round((d.statusCounts.pending / d.totalStatus) * 100), color: 'bg-[#ffd923]' },
                { label: 'Cancelled', pct: Math.round((d.statusCounts.cancelled / d.totalStatus) * 100), color: 'bg-[#e92935]' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                    <span className="font-bold text-[#071f52]">{s.label}</span>
                  </div>
                  <span className="font-semibold text-[#071f52]/56">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* revenue by vehicle */}
          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="text-base font-black text-[#071f52]">Revenue by Vehicle</h2>
            <p className="mt-1 text-sm text-[#071f52]/56">Top vehicles by total revenue.</p>
            {d.revenueByVehicle.length === 0 ? (
              <p className="mt-4 text-sm text-[#071f52]/48">No data yet.</p>
            ) : (
              <div className="mt-3 flex-1 min-h-0">
                <Bar
                  options={H_BAR_OPTIONS}
                  data={{
                    labels: d.revenueByVehicle.map((p) => p.label),
                    datasets: [{ data: d.revenueByVehicle.map((p) => p.value), backgroundColor: '#ffd923', borderRadius: 3 }],
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col gap-6">
          {/* daily bookings */}
          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="text-base font-black text-[#071f52]">Daily Bookings</h2>
            <p className="mt-1 text-sm text-[#071f52]/56">Booking volume last 7 days.</p>
            {d.dailyBookings.every((p) => p.value === 0) ? (
              <p className="mt-4 text-sm text-[#071f52]/48">No data yet.</p>
            ) : (
              <div className="mt-3 flex-1 min-h-0">
                <Line
                  options={LINE_OPTIONS('#071f52', (v) => `${v} bookings`, 0)}
                  data={{
                    labels: d.dailyBookings.map((p) => p.label),
                    datasets: [{ data: d.dailyBookings.map((p) => p.value), fill: true, backgroundColor: 'rgba(7,31,82,0.06)' }],
                  }}
                />
              </div>
            )}
          </div>

          {/* car types */}
          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="text-base font-black text-[#071f52]">Car Types</h2>
            <p className="mt-1 text-sm text-[#071f52]/56">Vehicle distribution by category.</p>
            <div className="mt-4 space-y-5">
              {d.vehicleTypeSeries.length === 0 ? (
                <p className="text-sm text-[#071f52]/48">No vehicle type data.</p>
              ) : (
                d.vehicleTypeSeries.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-[#071f52]">{item.label}</span>
                      <span className="font-semibold text-[#071f52]/56">{item.count} vehicles · {item.pct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#071f52]/8">
                      <div className="h-full rounded-full bg-[#e92935]" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* car bookings table */}
      <div className="mt-6 card">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-black text-[#071f52]">Car Bookings</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-[#071f52]/12 bg-[#071f52]/4 px-3 py-1.5">
              <Search size={14} className="text-[#071f52]/40" />
              <input
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search bookings..."
                className="bg-transparent text-xs font-medium text-[#071f52] outline-none placeholder:text-[#071f52]/32 w-36"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-[#071f52]/12 px-3 py-1.5 text-xs font-bold text-[#071f52]/56 hover:bg-[#071f52]/4 transition-colors">
              <Filter size={13} /> Filter
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#071f52]/8 text-xs font-bold text-[#071f52]/48 uppercase tracking-[0.08em]">
                <th className="pb-2.5 pr-3">Booking #</th>
                <th className="pb-2.5 pr-3">Date</th>
                <th className="pb-2.5 pr-3 hidden sm:table-cell">Client</th>
                <th className="pb-2.5 pr-3 hidden md:table-cell">Vehicle</th>
                <th className="pb-2.5 pr-3">Amount</th>
                <th className="pb-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {d.filteredBookings.map((b) => (
                <tr key={b.id} className="text-sm">
                  <td className="py-2.5 pr-3 font-bold text-[#071f52]">{b.id.slice(0, 8)}</td>
                  <td className="py-2.5 pr-3 text-[#071f52]/56">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-3 text-[#071f52]/56 hidden sm:table-cell">
                    {b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-[#071f52]/56 hidden md:table-cell">
                    {b.vehicles?.name || '—'}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-[#071f52]">{CURRENCY_FORMATTER.format(b.total_amount || 0)}</td>
                  <td className="py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
                      {formatBookingStatus(b.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.filteredBookings.length === 0 && (
            <p className="py-6 text-center text-sm text-[#071f52]/48">No bookings found.</p>
          )}
        </div>
        <div className="mt-4 border-t border-[#071f52]/6 pt-3">
          <Link to="/admin/bookings" className="text-xs font-bold text-[#071f52] hover:underline">View all bookings</Link>
        </div>
      </div>
    </div>
  )
}
