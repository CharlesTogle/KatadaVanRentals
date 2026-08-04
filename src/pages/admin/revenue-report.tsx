import { useState, useMemo, Fragment } from 'react'
import { subDays, format, parseISO, startOfDay } from 'date-fns'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useRevenueReport } from '@/hooks/use-bookings'
import type { VerifiedPaymentRow } from '@/services/booking-service'
import { cn } from '@/lib/utils'
import { Download, Table, BarChart3, X, Check } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Title, Tooltip, Legend)

type Period = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom'

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
  all: 'All time',
  custom: 'Custom',
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const CURRENCY_FORMATTER_DECIMAL = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CHART_FONT = { family: "'Plus Jakarta Sans', sans-serif" }
const COLORS = ['#071f52', '#e92935', '#ffd923', '#16a34a', '#7c3aed', '#db2777', '#0891b2', '#ea580c']

function channelLabel(channel: string, provider?: string | null): string {
  if (provider) return provider
  switch (channel) {
    case 'ewallet': return 'GCash'
    case 'bank_transfer': return 'Bank Transfer'
    case 'online_gateway': return 'Online'
    case 'cash': return 'Cash'
    default: return channel
  }
}

function channelCategory(channel: string): string {
  switch (channel) {
    case 'ewallet': return 'E-Wallet'
    case 'bank_transfer': return 'Bank'
    case 'online_gateway': return 'Online'
    case 'cash': return 'Cash'
    default: return 'Other'
  }
}

function getPeriodRange(period: Period, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  if (period === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(`${customTo}T23:59:59.999`).toISOString() }
  }
  if (period === 'all') return {}
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  return { from: subDays(startOfDay(new Date()), days).toISOString() }
}

const LINE_OPTIONS = (formatValue: (v: number) => string) => ({
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
      callbacks: {
        label: (ctx: TooltipItem<'line'>) => formatValue(ctx.parsed.y ?? 0),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { ...CHART_FONT, size: 10 }, color: 'rgba(7,31,82,0.5)', maxTicksLimit: 12 },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(7,31,82,0.08)' },
      ticks: { font: { ...CHART_FONT, size: 11 }, color: 'rgba(7,31,82,0.5)', callback: (v: string | number) => formatValue(Number(v)) },
    },
  },
  elements: {
    line: { tension: 0.35, borderColor: '#e92935', borderWidth: 3 },
    point: { radius: 3, backgroundColor: '#fff', borderColor: '#e92935', borderWidth: 2, hoverRadius: 5 },
  },
})

// ── sub-components ──

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#071f52]/48">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#071f52]">{value}</p>
      {sub && <p className="mt-1 text-xs font-medium text-[#071f52]/40">{sub}</p>}
    </div>
  )
}

function SectionLoader() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#071f52]/20 border-t-[#e92935]" />
    </div>
  )
}

interface PaymentMethodSummary {
  channel: string
  provider: string | null
  label: string
  category: string
  count: number
  revenue: number
  pct: number
}

interface VehicleSummary {
  vehicle_id: string
  name: string
  plate: string | null
  count: number
  revenue: number
}

interface CustomerSummary {
  customer_id: string | null
  name: string
  email: string | null
  count: number
  revenue: number
}

const CSV_FIELDS = [
  { key: 'date', label: 'Date' },
  { key: 'booking_number', label: 'Booking number' },
  { key: 'customer_name', label: 'Customer name' },
  { key: 'customer_email', label: 'Customer email' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'method', label: 'Payment method' },
  { key: 'category', label: 'Payment category' },
  { key: 'reference', label: 'Reference number' },
  { key: 'amount', label: 'Amount' },
] as const

type CsvField = (typeof CSV_FIELDS)[number]['key']

function escapeCsvField(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) return `"${value.replace(/"/g, '""')}"`
  return value
}

function downloadCsv(payments: VerifiedPaymentRow[], fields: CsvField[]) {
  const selectedDefs = CSV_FIELDS.filter((f) => fields.includes(f.key))
  const headers = selectedDefs.map((f) => f.label)
  const lines = payments.map((p) => {
    const name = [p.customer_first_name, p.customer_last_name].filter(Boolean).join(' ') || 'Guest'
    const date = p.paid_at ? format(parseISO(p.paid_at), 'yyyy-MM-dd') : ''
    const values: Record<CsvField, string> = {
      date,
      booking_number: p.booking_number,
      customer_name: name,
      customer_email: p.customer_email || '',
      vehicle: p.vehicle_name,
      method: channelLabel(p.channel, p.payment_method_provider),
      category: channelCategory(p.channel),
      reference: p.reference_number || '',
      amount: String(p.amount),
    }
    return selectedDefs.map((f) => escapeCsvField(values[f.key])).join(',')
  })
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── main ──

export default function RevenueReport() {
  const [period, setPeriod] = useState<Period>('all')
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [chartView, setChartView] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<CsvField[]>([
    'date', 'booking_number', 'customer_name', 'vehicle', 'method', 'amount',
  ])

  const dateRange = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo])

  const { data: payments = [], isLoading, isFetching } = useRevenueReport(dateRange.from, dateRange.to)

  const {
    totalRevenue,
    totalTransactions,
    avgPerTransaction,
    bestDay,
    dailyData,
    paymentMethods,
    topVehicles,
    topCustomers,
    chartData,
  } = useMemo(() => {
    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
    const totalTransactions = payments.length
    const avgPerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    let bestDay: { date: string; revenue: number } | null = null
    const dayMap = new Map<string, number>()
    for (const p of payments) {
      const date = p.paid_at
      if (!date) continue
      const key = format(parseISO(date), 'yyyy-MM-dd')
      dayMap.set(key, (dayMap.get(key) || 0) + p.amount)
    }
    for (const [key, rev] of dayMap) {
      if (!bestDay || rev > bestDay.revenue) bestDay = { date: key, revenue: rev }
    }
    const bestDayLabel = bestDay
      ? `${format(parseISO(bestDay.date), 'MMM d, yyyy')} · ${CURRENCY_FORMATTER.format(bestDay.revenue)}`
      : '—'

    // daily data for table
    const sortedDays = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue], i, arr) => {
        const count = payments.filter((p) => {
          const vt = p.paid_at
          return vt && format(parseISO(vt), 'yyyy-MM-dd') === date
        }).length
        const prevRevenue = i > 0 ? arr[i - 1][1] : 0
        const change = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : revenue > 0 ? 100 : 0
        return { date, label: format(parseISO(date), 'MMM d'), revenue, count, avg: count > 0 ? revenue / count : 0, change }
      })

    // chart data
    const chartData = sortedDays.map((d) => ({ label: d.label, value: d.revenue }))

    // payment methods
    const methodMap = new Map<string, { channel: string; provider: string | null; count: number; revenue: number }>()
    for (const p of payments) {
      const key = `${p.channel}|${p.payment_method_provider || ''}`
      const entry = methodMap.get(key) || { channel: p.channel, provider: p.payment_method_provider, count: 0, revenue: 0 }
      entry.count++
      entry.revenue += p.amount
      methodMap.set(key, entry)
    }
    const paymentMethods: PaymentMethodSummary[] = [...methodMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((m) => ({
        ...m,
        label: channelLabel(m.channel, m.provider),
        category: channelCategory(m.channel),
        pct: totalRevenue > 0 ? Math.round((m.revenue / totalRevenue) * 100) : 0,
      }))

    // top vehicles
    const vehMap = new Map<string, VehicleSummary>()
    for (const p of payments) {
      const entry = vehMap.get(p.vehicle_id) || { vehicle_id: p.vehicle_id, name: p.vehicle_name, plate: p.vehicle_plate, count: 0, revenue: 0 }
      entry.count++
      entry.revenue += p.amount
      vehMap.set(p.vehicle_id, entry)
    }
    const topVehicles = [...vehMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // top customers
    const custMap = new Map<string | null, CustomerSummary>()
    for (const p of payments) {
      const key = p.customer_id
      if (!custMap.has(key)) {
        const name = [p.customer_first_name, p.customer_last_name].filter(Boolean).join(' ') || 'Guest'
        custMap.set(key, { customer_id: key, name, email: p.customer_email, count: 0, revenue: 0 })
      }
      const entry = custMap.get(key)!
      entry.count++
      entry.revenue += p.amount
    }
    const topCustomers = [...custMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    return {
      totalRevenue,
      totalTransactions,
      avgPerTransaction,
      bestDay: bestDayLabel,
      dailyData: sortedDays,
      paymentMethods,
      topVehicles,
      topCustomers,
      chartData,
    }
  }, [payments])

  const toggleField = (key: CsvField) => {
    setSelectedFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  const toggleAllFields = () => {
    if (selectedFields.length === CSV_FIELDS.length) {
      setSelectedFields([])
    } else {
      setSelectedFields(CSV_FIELDS.map((f) => f.key))
    }
  }

  return (
    <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Revenue Report</h1>
          <p className="mt-0.5 text-sm font-medium text-[#071f52]/48">Verified payment collections.</p>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          disabled={payments.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-[#071f52]/12 bg-white px-4 py-2 text-sm font-bold text-[#071f52]/64 transition-colors hover:bg-[#071f52]/4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* ── period filter ── */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Fragment key={p}>
            {p === 'custom' && <span className="mx-1 h-5 w-px bg-[#071f52]/12" />}
            <button
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                period === p
                  ? 'bg-[#071f52] text-white'
                  : 'text-[#071f52]/56 hover:bg-[#071f52]/8 hover:text-[#071f52]',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          </Fragment>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-[#071f52]/12 bg-white px-2.5 py-1.5 text-xs font-medium text-[#071f52] outline-none focus:border-[#071f52]/32"
            />
            <span className="text-xs text-[#071f52]/40">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-[#071f52]/12 bg-white px-2.5 py-1.5 text-xs font-medium text-[#071f52] outline-none focus:border-[#071f52]/32"
            />
          </div>
        )}
      </div>

      {/* ── summary cards ── */}
      <div className="mt-6 relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-20 rounded bg-[#071f52]/10" />
              <div className="mt-3 h-7 w-28 rounded bg-[#071f52]/6" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Revenue" value={CURRENCY_FORMATTER.format(totalRevenue)} />
            <StatCard label="Transactions" value={totalTransactions.toLocaleString()} />
            <StatCard label="Average per Transaction" value={CURRENCY_FORMATTER_DECIMAL.format(avgPerTransaction)} />
            <StatCard label="Best Day" value={bestDay} />
          </>
        )}
        {isFetching && !isLoading && <SectionLoader />}
      </div>

      {/* ── daily revenue graph ── */}
      <div className="mt-6 card relative">
        {(isFetching && !isLoading) && <SectionLoader />}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#071f52]">Daily Revenue</h2>
            <p className="mt-1 text-sm text-[#071f52]/56">Verified revenue per day.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#071f52]/12 bg-[#071f52]/4 p-0.5">
            <button
              onClick={() => setChartView(true)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
                chartView ? 'bg-white text-[#071f52] shadow-sm' : 'text-[#071f52]/48',
              )}
            >
              <BarChart3 size={13} /> Chart
            </button>
            <button
              onClick={() => setChartView(false)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
                !chartView ? 'bg-white text-[#071f52] shadow-sm' : 'text-[#071f52]/48',
              )}
            >
              <Table size={13} /> Table
            </button>
          </div>
        </div>

        {chartView ? (
          <div className="mt-5 h-72">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#071f52]/40">No revenue data for this period.</div>
            ) : (
              <Line
                options={LINE_OPTIONS((v) => CURRENCY_FORMATTER.format(v))}
                data={{
                  labels: chartData.map((d) => d.label),
                  datasets: [{ data: chartData.map((d) => d.value), fill: true, backgroundColor: 'rgba(233,41,53,0.08)' }],
                }}
              />
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                  <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">DAY</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TRANSACTIONS</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">REVENUE</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 hidden sm:table-cell">AVG/TRANS</th>
                  <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 hidden sm:table-cell">CHANGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071f52]/6">
                {dailyData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#071f52]/40">No daily data for this period.</td>
                  </tr>
                ) : (
                  <>
                    {dailyData.map((d) => (
                      <tr key={d.date} className="hover:bg-[#f7f9ff] transition-colors">
                        <td className="px-5 py-3 font-bold text-[#071f52]">{d.label}</td>
                        <td className="px-5 py-3 text-[#071f52]/64">{d.count}</td>
                        <td className="px-5 py-3 font-semibold text-[#071f52]">{CURRENCY_FORMATTER.format(d.revenue)}</td>
                        <td className="px-5 py-3 text-[#071f52]/56 hidden sm:table-cell">{CURRENCY_FORMATTER_DECIMAL.format(d.avg)}</td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          <span className={cn('font-bold', d.change >= 0 ? 'text-[#16a34a]' : 'text-[#e92935]')}>
                            {d.change >= 0 ? '+' : ''}{d.change}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#071f52]/10 bg-[#071f52]/3 font-black text-[#071f52]">
                      <td className="px-5 py-3">TOTAL</td>
                      <td className="px-5 py-3">{totalTransactions}</td>
                      <td className="px-5 py-3">{CURRENCY_FORMATTER.format(totalRevenue)}</td>
                      <td className="px-5 py-3 hidden sm:table-cell">{CURRENCY_FORMATTER_DECIMAL.format(avgPerTransaction)}</td>
                      <td className="px-5 py-3 hidden sm:table-cell">—</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── three-column row ── */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Payment Methods */}
        <div className="card relative">
          {(isFetching && !isLoading) && <SectionLoader />}
          <h2 className="text-base font-black text-[#071f52]">Payment Methods</h2>
          <p className="mt-1 text-sm text-[#071f52]/56">How customers paid.</p>
          {paymentMethods.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[#071f52]/40">No payment data.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {paymentMethods.map((m, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-[#071f52]">{m.label}</span>
                      <span className="ml-2 text-xs text-[#071f52]/40">{m.category}</span>
                    </div>
                    <span className="font-semibold text-[#071f52]/56">{m.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#071f52]/8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#071f52]/40">
                    <span>{m.count} transaction{m.count !== 1 ? 's' : ''}</span>
                    <span>{CURRENCY_FORMATTER.format(m.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vehicles */}
        <div className="card relative">
          {(isFetching && !isLoading) && <SectionLoader />}
          <h2 className="text-base font-black text-[#071f52]">Top Vehicles</h2>
          <p className="mt-1 text-sm text-[#071f52]/56">By verified revenue.</p>
          {topVehicles.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[#071f52]/40">No vehicle data.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {topVehicles.map((v, i) => (
                <div key={v.vehicle_id} className="flex items-center gap-3 rounded-lg bg-[#071f52]/3 px-3 py-2.5">
                  <span className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                    i === 0 ? 'bg-[#ffd923] text-[#071f52]' : 'bg-[#071f52]/10 text-[#071f52]/48',
                  )}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#071f52]">{v.name}</p>
                    {v.plate && <p className="text-xs text-[#071f52]/40">{v.plate}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#071f52]">{CURRENCY_FORMATTER.format(v.revenue)}</p>
                    <p className="text-xs text-[#071f52]/40">{v.count} payment{v.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="card relative">
          {(isFetching && !isLoading) && <SectionLoader />}
          <h2 className="text-base font-black text-[#071f52]">Top Customers</h2>
          <p className="mt-1 text-sm text-[#071f52]/56">By verified payments.</p>
          {topCustomers.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[#071f52]/40">No customer data.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {topCustomers.map((c, i) => (
                <div key={c.customer_id || `guest-${i}`} className="flex items-center gap-3 rounded-lg bg-[#071f52]/3 px-3 py-2.5">
                  <span className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                    i === 0 ? 'bg-[#ffd923] text-[#071f52]' : 'bg-[#071f52]/10 text-[#071f52]/48',
                  )}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#071f52]">{c.name}</p>
                    {c.email && <p className="truncate text-xs text-[#071f52]/40">{c.email}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#071f52]">{CURRENCY_FORMATTER.format(c.revenue)}</p>
                    <p className="text-xs text-[#071f52]/40">{c.count} booking{c.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── transaction table ── */}
      <div className="mt-6 card relative">
        {(isFetching && !isLoading) && <SectionLoader />}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#071f52]">Payment Transactions</h2>
            <p className="mt-1 text-sm text-[#071f52]/56">Verified payments for the selected period.</p>
          </div>
          <span className="rounded-full bg-[#071f52]/6 px-3 py-1 text-xs font-bold text-[#071f52]/56">
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">DATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BOOKING</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 hidden md:table-cell">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 hidden lg:table-cell">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">METHOD</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 hidden sm:table-cell">REFERENCE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#071f52]/40">
                    No verified payments for this period.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f7f9ff] transition-colors">
                    <td className="px-5 py-3 text-[#071f52]/56 whitespace-nowrap">
                      {p.paid_at ? format(parseISO(p.paid_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3 font-bold text-[#071f52] whitespace-nowrap">{p.booking_number}</td>
                    <td className="px-5 py-3 text-[#071f52]/64 hidden md:table-cell">
                      {[p.customer_first_name, p.customer_last_name].filter(Boolean).join(' ') || 'Guest'}
                    </td>
                    <td className="px-5 py-3 text-[#071f52]/64 hidden lg:table-cell">{p.vehicle_name}</td>
                    <td className="px-5 py-3 text-[#071f52]/64">{channelLabel(p.channel, p.payment_method_provider)}</td>
                    <td className="px-5 py-3 text-[#071f52]/48 font-mono text-xs hidden sm:table-cell">
                      {p.reference_number || '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[#071f52]">
                      {CURRENCY_FORMATTER.format(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CSV export modal ── */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setExportOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#071f52]">Export CSV</h3>
              <button onClick={() => setExportOpen(false)} className="rounded-lg p-1 text-[#071f52]/40 hover:text-[#071f52] transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-sm text-[#071f52]/56">Select columns to include in the export.</p>

            <div className="mt-4 space-y-1">
              <button
                onClick={toggleAllFields}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-bold text-[#071f52]/64 hover:bg-[#071f52]/4 transition-colors"
              >
                <span className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                  selectedFields.length === CSV_FIELDS.length ? 'bg-[#071f52] border-[#071f52]' : 'border-[#071f52]/20',
                )}>
                  {selectedFields.length === CSV_FIELDS.length && <Check size={10} className="text-white" />}
                </span>
                Select All ({selectedFields.length}/{CSV_FIELDS.length})
              </button>
              {CSV_FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => toggleField(f.key)}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-[#071f52] hover:bg-[#071f52]/4 transition-colors"
                >
                  <span className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    selectedFields.includes(f.key) ? 'bg-[#071f52] border-[#071f52]' : 'border-[#071f52]/20',
                  )}>
                    {selectedFields.includes(f.key) && <Check size={10} className="text-white" />}
                  </span>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setExportOpen(false)}
                className="flex-1 rounded-lg border border-[#071f52]/12 px-4 py-2 text-sm font-bold text-[#071f52]/64 hover:bg-[#071f52]/4 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { downloadCsv(payments, selectedFields); setExportOpen(false) }}
                disabled={selectedFields.length === 0}
                className="flex-1 rounded-lg bg-[#e92935] px-4 py-2 text-sm font-bold text-white hover:bg-[#c91f2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
