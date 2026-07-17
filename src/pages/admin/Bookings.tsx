import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

const statuses = [
  { value: '', label: 'All' },
  { value: 'for_review', label: 'For Review' },
  { value: 'awaiting_documents', label: 'Awaiting Docs' },
  { value: 'pending_price_approval', label: 'Pending Price' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'on_trip', label: 'On Trip' },
  { value: 'completed', label: 'Completed' },
]

const statusColors: Record<string, string> = {
  for_review: 'bg-[#ffd923]/20 text-[#b8860b]',
  awaiting_documents: 'bg-[#e92935]/10 text-[#c91f2a]',
  pending_price_approval: 'bg-[#ffd923]/20 text-[#b8860b]',
  confirmed: 'bg-[#16a34a]/10 text-[#16a34a]',
  rejected: 'bg-[#e92935]/10 text-[#c91f2a]',
  canceled: 'bg-gray-100 text-gray-500',
  on_trip: 'bg-[#071f52]/10 text-[#071f52]',
  completed: 'bg-[#16a34a]/10 text-[#16a34a]',
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let query = supabase
      .from('bookings')
      .select('*, profiles!customer_id(first_name,last_name,email), vehicles!vehicle_id(name,plate_number)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (search) query = query.or(`booking_number.ilike.%${search}%,profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%`)

    query.then(({ data }) => {
      if (data) setBookings(data)
      setLoading(false)
    })
  }, [status, search])

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Bookings</h1>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking or customer..."
            className="w-64 rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              status === s.value
                ? 'bg-[#071f52] text-white'
                : 'bg-white text-[#071f52]/58 border border-[#071f52]/10 hover:bg-[#071f52]/8',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No bookings found.
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.06)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BOOKING #</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TOTAL</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-[#f7f9ff] transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">{b.booking_number}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-[#071f52]">
                        {b.profiles?.first_name} {b.profiles?.last_name}
                      </p>
                      <p className="text-xs text-[#071f52]/48">{b.profiles?.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-[#071f52]">{b.vehicles?.name}</p>
                    <p className="text-xs text-[#071f52]/48">{b.vehicles?.plate_number}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">₱{b.total_amount?.toLocaleString()}.00</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', statusColors[b.status])}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
