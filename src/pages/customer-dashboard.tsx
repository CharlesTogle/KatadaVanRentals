import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { Button } from '@/components/ui/button'
import { Plus, CalendarDays, CheckCircle2, Clock, XCircle } from 'lucide-react'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || 'there'

  const kpis = [
    { label: 'Active Rentals', value: '0', icon: Clock, color: 'text-[#e92935]' },
    { label: 'Confirmed', value: '0', icon: CheckCircle2, color: 'text-[#16a34a]' },
    { label: 'Pending Review', value: '0', icon: CalendarDays, color: 'text-[#ffd923]' },
    { label: 'Canceled', value: '0', icon: XCircle, color: 'text-[#071f52]/38' },
  ]

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">
            Welcome back, {name}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#071f52]/58">
            Here's your rental activity at a glance.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 gap-2 bg-[#e92935] text-white shadow-[0_12px_24px_rgba(233,41,53,0.2)] hover:bg-[#c91f2a]">
          <Link to="/our-fleet"><Plus size={18} /> Book Now</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="card"
          >
            <div className="flex items-center gap-2">
              <Icon size={18} className={color} />
              <p className="text-xs font-bold text-[#071f52]/48">{label}</p>
            </div>
            <p className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#071f52]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-black tracking-[-0.02em] text-[#071f52]">Recent Bookings</h2>
        <div className="mt-3 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <CalendarDays size={36} className="mx-auto text-[#071f52]/20" />
          <p className="mt-3 text-sm font-medium text-[#071f52]/48">No bookings yet. Ready to hit the road?</p>
          <Button asChild size="lg" className="mt-5 gap-2 bg-[#071f52] text-white hover:bg-[#112458]">
            <Link to="/our-fleet">Browse Fleet</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
