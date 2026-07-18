import { useAdminDashboard } from '@/hooks/use-bookings'
import { Link } from 'react-router-dom'
import { STATUS_COLORS } from '@/config/constants'

type BookingKPI = { id: string; status: string; total_amount: number; created_at: string }
type RecentSignup = { id: string; first_name: string; last_name: string; email: string; created_at: string }
type TopVehicle = { id: string; name: string; slug: string }

export default function Dashboard() {
  const { data: raw, isLoading } = useAdminDashboard()

  const data = raw ? (() => {
    const bookings = (raw.bRes.data || []) as BookingKPI[]
    const mtdStart = new Date()
    mtdStart.setDate(1); mtdStart.setHours(0, 0, 0, 0)
    const mtdBookings = bookings.filter((b) => new Date(b.created_at) >= mtdStart)
    return {
      kpis: {
        bookings: raw.bRes.count || 0,
        active: bookings.filter((b) => b.status === 'on_trip').length,
        review: bookings.filter((b) => b.status === 'for_review').length,
        revenue: mtdBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      },
      recentSignups: (raw.pRes.data || []) as RecentSignup[],
      recentBookings: (raw.rbRes.data || []) as { id: string; booking_number: string; vehicle_id: string; status: string; created_at: string; total_amount: number; customer_id: string; profiles: { first_name: string; last_name: string }[] | null; vehicles: { name: string }[] | null }[],
      topVehicles: (raw.vRes.data || []) as TopVehicle[],
    }
  })() : undefined

  if (isLoading) {
    return (
      <div className="px-6 py-8 animate-pulse space-y-6">
        <div className="h-7 w-40 rounded-lg bg-[#071f52]/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#071f52]/6" />)}
        </div>
        <div className="h-48 rounded-xl bg-[#071f52]/6" />
      </div>
    )
  }

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Bookings', value: data?.kpis.bookings },
          { label: 'Active Rentals', value: data?.kpis.active },
          { label: 'For Review', value: data?.kpis.review },
          { label: 'Revenue (MTD)', value: `₱${(data?.kpis.revenue || 0).toLocaleString()}` },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm font-bold text-[#071f52]/58">{stat.label}</p>
            <p className="mt-1 text-2xl font-black text-[#071f52]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#071f52]">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-bold text-[#e92935] hover:underline">View all</Link>
          </div>
          {(data?.recentBookings || []).length === 0 ? (
            <p className="mt-4 text-sm text-[#071f52]/48">No bookings yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(data?.recentBookings || []).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-[#071f52]/8 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-[#071f52]">{b.booking_number}</p>
                    <p className="text-xs text-[#071f52]/58">
                      {b.profiles?.[0]?.first_name} {b.profiles?.[0]?.last_name} · {b.vehicles?.[0]?.name}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_COLORS[b.status] || 'bg-[#ffd923]/20 text-[#b8860b]'}`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-black text-[#071f52]">Top Vehicles</h2>
          {(data?.topVehicles || []).length === 0 ? (
            <p className="mt-4 text-sm text-[#071f52]/48">No vehicles listed.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(data?.topVehicles || []).map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl border border-[#071f52]/8 px-4 py-2.5">
                  <span className="text-sm font-bold text-[#071f52]">{v.name}</span>
                  <span className="text-xs font-semibold text-[#071f52]/48">{v.slug}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(data?.recentSignups || []).length > 0 && (
        <div className="mt-6 card">
          <h2 className="text-base font-black text-[#071f52]">Recent Signups</h2>
          <div className="mt-3 space-y-2">
            {(data?.recentSignups || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-[#071f52]/8 px-4 py-2.5">
                <div>
                  <p className="text-sm font-bold text-[#071f52]">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-[#071f52]/58">{p.email}</p>
                </div>
                <span className="text-xs font-medium text-[#071f52]/48">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
