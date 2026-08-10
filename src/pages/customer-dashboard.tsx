import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { Button } from '@/components/ui/button'
import { useMyBookings } from '@/hooks/use-bookings'
import { STATUS_COLORS } from '@/config/constants'
import { cn } from '@/lib/utils'
import { formatBookingStatus } from '@/lib/booking-utils'
import { ChevronRight, CalendarDays, CheckCircle2, Clock, XCircle } from 'lucide-react'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'there'
  const { data: bookings = [] } = useMyBookings()

  const kpis = [
    { label: 'Active Rentals', value: bookings.filter((booking: any) => booking.status === 'on_trip').length, icon: Clock, color: 'text-[#15803d]' },
    { label: 'Confirmed', value: bookings.filter((booking: any) => booking.status === 'confirmed').length, icon: CheckCircle2, color: 'text-[#16a34a]' },
    { label: 'Pending Review', value: bookings.filter((booking: any) => booking.status === 'for_review').length, icon: CalendarDays, color: 'text-[#ffd923]' },
    { label: 'Canceled', value: bookings.filter((booking: any) => booking.status === 'canceled').length, icon: XCircle, color: 'text-[#e92935]' },
  ]

  const recentBookings = bookings.slice(0, 3)

  return (
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black tracking-[-0.02em] text-[#071f52] sm:text-3xl sm:tracking-[-0.03em]">
            Welcome back, {name}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-[#071f52]/58 sm:text-sm">
            Here's your rental activity at a glance.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5 bg-[#e92935] text-xs text-white shadow-[0_8px_16px_rgba(233,41,53,0.2)] hover:bg-[#c91f2a] sm:size-lg sm:gap-2 sm:shadow-[0_12px_24px_rgba(233,41,53,0.2)]">
          <Link to="/our-fleet"><ChevronRight size={14} className="sm:hidden" /><ChevronRight size={18} className="hidden sm:block" /> Book a Van</Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:mt-6 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="card"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Icon size={14} className={`${color} sm:hidden`} />
              <Icon size={18} className={`${color} hidden sm:block`} />
              <p className="text-[11px] font-bold text-[#071f52]/48 sm:text-xs">{label}</p>
            </div>
            <p className="mt-1.5 text-xl font-black tracking-[-0.02em] text-[#071f52] sm:mt-2 sm:text-3xl sm:tracking-[-0.03em]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 className="text-sm font-black tracking-[-0.02em] text-[#071f52] sm:text-lg">Recent Bookings</h2>
        <div className="mt-2 rounded-lg border border-[#071f52]/10 bg-white p-4 shadow-[0_4px_16px_rgba(7,31,82,0.04)] sm:mt-3 sm:p-8 sm:shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          {!recentBookings.length ? (
            <div className="flex flex-col items-center text-center">
              <CalendarDays size={28} className="text-[#071f52]/20 sm:hidden" />
              <CalendarDays size={36} className="text-[#071f52]/20 hidden sm:block" />
              <p className="mt-2 text-xs font-medium text-[#071f52]/48 sm:mt-3 sm:text-sm">No bookings yet. Ready to hit the road?</p>
              <Button asChild size="sm" className="mt-4 gap-1.5 bg-[#071f52] text-xs text-white hover:bg-[#112458] sm:size-lg sm:mt-5 sm:gap-2">
                <Link to="/our-fleet">Browse Fleet</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentBookings.map((booking: any) => (
                <Link key={booking.id} to={`/dashboard/bookings/${booking.id}`} className="flex items-center justify-between rounded-lg border border-[#071f52]/8 px-3 py-2.5 transition-colors hover:bg-[#f7f9ff]">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#071f52] sm:text-sm">{booking.booking_number}</p>
                    <p className="truncate text-[11px] text-[#071f52]/58 sm:text-xs">{booking.vehicles?.name || 'Vehicle pending'} · ₱{Number(booking.total_amount || 0).toLocaleString()}.00</p>
                  </div>
                  <span className={cn('ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-[11px]', STATUS_COLORS[booking.status])}>
                    {formatBookingStatus(booking.status)}
                  </span>
                </Link>
              ))}
              <Button asChild variant="outline" className="mt-2 w-full text-xs sm:text-sm">
                <Link to="/bookings">View all bookings</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
