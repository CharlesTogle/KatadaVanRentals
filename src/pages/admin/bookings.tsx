import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminBookings, useDeleteBooking } from '@/hooks/use-bookings'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import { formatBookingStatus } from '@/lib/booking-utils'
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { STATUS_COLORS } from '@/config/constants'

const PAGE_SIZE = 20

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
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useAdminBookings({ status: status || undefined, search: search || undefined, page, pageSize: PAGE_SIZE })
  const deleteBooking = useDeleteBooking()
  const bookings = data?.items || []
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const loading = isLoading || isFetching

  const handleDeleteBooking = async (bookingId: string, bookingNumber: string) => {
    const confirmed = window.confirm(`Delete booking ${bookingNumber}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteBooking.mutateAsync({ id: bookingId })
      toast.success(`Booking ${bookingNumber} deleted.`)
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

  return (
    <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Bookings</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/bookings/create"
            className="rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0b2f7d]"
          >
            Create booking
          </Link>
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search..."
              aria-label="Search bookings"
              className="w-full sm:w-56 rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => {
              setStatus(s.value)
              setPage(1)
            }}
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

      {(loading || bookings.length > 0) ? (
        <div className="mt-6 card-overflow">
          <div className="flex items-center justify-between border-b border-[#071f52]/10 bg-white px-5 py-3">
            <p className="text-xs font-semibold text-[#071f52]/48">Show 20 per page</p>
            <PaginationControls page={currentPage} totalPages={totalPages} setPage={setPage} disabled={loading} />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : !bookings.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No bookings found.
        </div>
      ) : (
        <div className="-mt-1 card-overflow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BOOKING #</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">START DATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">END DATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TOTAL</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {bookings.map((b: any) => {
                return (
                <tr
                  key={b.id}
                  tabIndex={0}
                  aria-label={`View booking ${b.booking_number}`}
                  onClick={() => navigate(`/admin/bookings/${b.booking_number}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/admin/bookings/${b.booking_number}`)
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-[#f7f9ff] focus:bg-[#f7f9ff] focus:outline-none"
                >
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
                  <td className="px-5 py-3 text-sm font-semibold text-[#071f52]">
                    {formatStartDate(b.start_at)}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-[#071f52]">
                    {formatStartDate(b.end_at)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">{b.flagged_for_manual_pricing ? 'TBD' : `₱${b.total_amount?.toLocaleString()}.00`}</span>
                  </td>
                  <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                    <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', STATUS_COLORS[b.status])}>
                      {formatBookingStatus(b.status)}
                    </span>
                  </td>
                   <td className="px-5 py-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                     <button
                       type="button"
                       aria-label={`Delete booking ${b.booking_number}`}
                       onClick={() => handleDeleteBooking(b.id, b.booking_number)}
                       disabled={deleteBooking.isPending}
                       className="rounded-full bg-white p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                     >
                       <Trash2 size={16} />
                     </button>
                   </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PaginationControls({
  page,
  totalPages,
  setPage,
  disabled = false,
}: {
  page: number
  totalPages: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  disabled?: boolean
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-3 flex items-center justify-end gap-3">
      <p className="text-xs font-semibold text-[#071f52]/48">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={disabled || page === 1}
          className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={disabled || page === totalPages}
          className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function formatStartDate(value: string | null | undefined) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
