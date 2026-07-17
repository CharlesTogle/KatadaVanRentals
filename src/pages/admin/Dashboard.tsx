import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [kpis, setKpis] = useState({ bookings: 0, active: 0, review: 0, revenue: 0 })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [recentSignups, setRecentSignups] = useState<any[]>([])
  const [topVehicles, setTopVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('bookings').select('id,status,total_amount', { count: 'exact' }),
      supabase.from('profiles').select('id,first_name,last_name,email,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('bookings').select('id,booking_number,vehicle_id,status,created_at, total_amount, customer_id, profiles!customer_id(first_name,last_name), vehicles!vehicle_id(name)').order('created_at', { ascending: false }).limit(3),
      supabase.from('vehicles').select('id,name,slug').eq('is_available', true),
    ]).then(([bRes, pRes, rbRes, vRes]) => {
      const bookings = bRes.data || []
      setKpis({
        bookings: bRes.count || 0,
        active: bookings.filter((b: any) => b.status === 'on_trip').length,
        review: bookings.filter((b: any) => b.status === 'for_review').length,
        revenue: bookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
      })
      setRecentSignups(pRes.data || [])
      setRecentBookings(rbRes.data || [])
      setTopVehicles(vRes.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
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
          { label: 'Total Bookings', value: kpis.bookings },
          { label: 'Active Rentals', value: kpis.active },
          { label: 'For Review', value: kpis.review },
          { label: 'Revenue (MTD)', value: `₱${kpis.revenue.toLocaleString()}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
            <p className="text-sm font-bold text-[#071f52]/58">{stat.label}</p>
            <p className="mt-1 text-2xl font-black text-[#071f52]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#071f52]">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-bold text-[#e92935] hover:underline">View all</Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="mt-4 text-sm text-[#071f52]/48">No bookings yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-[#071f52]/8 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-[#071f52]">{b.booking_number}</p>
                    <p className="text-xs text-[#071f52]/58">
                      {b.profiles?.first_name} {b.profiles?.last_name} · {b.vehicles?.name}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    b.status === 'confirmed' ? 'bg-[#16a34a]/10 text-[#16a34a]' :
                    b.status === 'on_trip' ? 'bg-[#071f52]/10 text-[#071f52]' :
                    b.status === 'canceled' ? 'bg-gray-100 text-gray-500' :
                    'bg-[#ffd923]/20 text-[#b8860b]'
                  }`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <h2 className="text-base font-black text-[#071f52]">Top Vehicles</h2>
          {topVehicles.length === 0 ? (
            <p className="mt-4 text-sm text-[#071f52]/48">No vehicles listed.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {topVehicles.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl border border-[#071f52]/8 px-4 py-2.5">
                  <span className="text-sm font-bold text-[#071f52]">{v.name}</span>
                  <span className="text-xs font-semibold text-[#071f52]/48">{v.slug}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recentSignups.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <h2 className="text-base font-black text-[#071f52]">Recent Signups</h2>
          <div className="mt-3 space-y-2">
            {recentSignups.map((p: any) => (
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
