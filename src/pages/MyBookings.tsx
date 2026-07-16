import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronRight } from 'lucide-react'

const statuses = [
  'All',
  'For Review',
  'Awaiting Documents',
  'Pending Price',
  'Confirmed',
  'Rejected',
  'Canceled',
  'On Trip',
  'Completed',
]

export default function MyBookings() {
  const [filter, setFilter] = useState('All')

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
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === s
                ? 'bg-[#071f52] text-white shadow-sm'
                : 'border border-[#071f52]/14 bg-white text-[#071f52]/58 hover:border-[#071f52]/30 hover:text-[#071f52]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white p-10 text-center shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7f9ff]">
          <CalendarDays size={28} className="text-[#071f52]/24" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#071f52]/48">
          {filter === 'All' ? 'No bookings yet.' : `No "${filter}" bookings.`}
        </p>
        <p className="mt-1 text-xs font-medium text-[#071f52]/38">
          When you book a van, it will appear here with status updates.
        </p>
        <Button asChild size="lg" className="mt-5 gap-2 bg-[#071f52] text-white hover:bg-[#112458]">
          <Link to="/our-fleet">Browse Fleet</Link>
        </Button>
      </div>
    </div>
  )
}
