import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminBookings, useDeleteBooking } from '@/hooks/use-bookings'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import { formatBookingStatus } from '@/lib/booking-utils'
import { MoreHorizontal, Search } from 'lucide-react'
import { STATUS_COLORS } from '@/config/constants'

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

export default function AdminBookings() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const { data: bookings = [], isLoading } = useAdminBookings({ status: status || undefined, search: search || undefined })
  const deleteBooking = useDeleteBooking()

  const handleDeleteBooking = async (bookingId: string, bookingNumber: string) => {
    const confirmed = window.confirm(`Delete booking ${bookingNumber}? This cannot be undone.`)
    setOpenMenuId(null)

    if (!confirmed) return

    try {
      await deleteBooking.mutateAsync({ id: bookingId })
      toast.success(`Booking ${bookingNumber} deleted.`)
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Bookings</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/bookings/create"
            className="rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0b2f7d]"
          >
            Create booking
          </Link>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search booking or customer..."
              aria-label="Search bookings"
              className="w-64 rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
            />
          </div>
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

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : !bookings.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No bookings found.
        </div>
      ) : (
        <div className="mt-6 card-overflow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BOOKING #</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TOTAL</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-[#f7f9ff] transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/admin/bookings/${b.booking_number}`} className="text-sm font-bold text-[#071f52] hover:underline">
                      {b.booking_number}
                    </Link>
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
                    <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', STATUS_COLORS[b.status])}>
                      {formatBookingStatus(b.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="relative flex justify-start">
                      <button
                        type="button"
                        aria-label={`Open actions for ${b.booking_number}`}
                        aria-expanded={openMenuId === b.id}
                        onClick={() => setOpenMenuId((current) => current === b.id ? null : b.id)}
                        className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {openMenuId === b.id ? (
                        <div className="absolute right-0 top-11 z-10 min-w-40 rounded-2xl border border-[#071f52]/10 bg-white p-1.5 shadow-xl">
                          <Link
                            to={`/admin/bookings/${b.booking_number}`}
                            onClick={() => setOpenMenuId(null)}
                            className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#071f52] transition-colors hover:bg-[#f7f9ff]"
                          >
                            View Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(b.id, b.booking_number)}
                            disabled={deleteBooking.isPending}
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#e92935] transition-colors hover:bg-[#fff4f4] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
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
