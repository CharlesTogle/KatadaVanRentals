import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMyBookings } from '@/hooks/use-bookings'
import { STATUS_COLORS } from '@/config/constants'
import { cn } from '@/lib/utils'
import { formatBookingStatus } from '@/lib/booking-utils'
import { CalendarDays, ChevronRight } from 'lucide-react'

const statuses = [
  { label: 'All', value: '' },
  { label: 'For Review', value: 'for_review' },
  { label: 'Awaiting Documents', value: 'awaiting_documents' },
  { label: 'Pending Price', value: 'pending_price_approval' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'On Trip', value: 'on_trip' },
  { label: 'Completed', value: 'completed' },
]

export default function MyBookings() {
  const [filter, setFilter] = useState('')
  const { data: bookings = [], isLoading } = useMyBookings(filter || undefined)

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">My Bookings</h1>
          <p className="mt-1 text-sm font-medium text-[#071f52]/58">Track your upcoming and past rentals.</p>
        </div>
        <Button asChild size="lg" className="shrink-0 gap-2 bg-[#e92935] text-white shadow-[0_12px_24px_rgba(233,41,53,0.2)] hover:bg-[#c91f2a]">
          <Link to="/our-fleet"><ChevronRight size={18} /> Book a Van</Link>
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === s.value
                ? 'bg-[#071f52] text-white shadow-sm'
                : 'border border-[#071f52]/14 bg-white text-[#071f52]/58 hover:border-[#071f52]/30 hover:text-[#071f52]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, index) => <div key={index} className="h-24 rounded-2xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : !bookings.length ? (
      <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white p-10 text-center shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7f9ff]">
          <CalendarDays size={28} className="text-[#071f52]/24" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#071f52]/48">
          {filter === '' ? 'No bookings yet.' : `No "${statuses.find((status) => status.value === filter)?.label}" bookings.`}
        </p>
        <p className="mt-1 text-xs font-medium text-[#071f52]/38">
          When you book a van, it will appear here with status updates.
        </p>
        <Button asChild size="lg" className="mt-5 gap-2 bg-[#071f52] text-white hover:bg-[#112458]">
          <Link to="/our-fleet">Browse Fleet</Link>
        </Button>
      </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((booking: any) => (
            <Link
              key={booking.id}
              to={`/dashboard/bookings/${booking.id}`}
              className="block rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)] transition-colors hover:border-[#071f52]/25"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#071f52]">{booking.booking_number}</p>
                  <p className="mt-1 text-sm font-semibold text-[#071f52]/66">{booking.vehicles?.name || 'Vehicle pending'}</p>
                  <p className="mt-1 text-xs text-[#071f52]/48">
                    {new Date(booking.start_at).toLocaleDateString()} {booking.end_at ? `to ${new Date(booking.end_at).toLocaleDateString()}` : ''} · {booking.duration_days} day{Number(booking.duration_days) === 1 ? '' : 's'}
                  </p>
                </div>
                <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', STATUS_COLORS[booking.status])}>
                  {formatBookingStatus(booking.status)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold text-[#071f52]/48">Total</p>
                  <p className="font-bold text-[#071f52]">₱{Number(booking.total_amount || 0).toLocaleString()}.00</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#071f52]/48">Paid</p>
                  <p className="font-bold text-[#16a34a]">₱{Number(booking.paid_amount || 0).toLocaleString()}.00</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#071f52]/48">Remaining</p>
                  <p className="font-bold text-[#e92935]">₱{Number(booking.remaining_amount || 0).toLocaleString()}.00</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
