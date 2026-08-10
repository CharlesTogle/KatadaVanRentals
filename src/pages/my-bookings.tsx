import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMyBookings } from '@/hooks/use-bookings'
import { STATUS_COLORS } from '@/config/constants'
import { cn } from '@/lib/utils'
import { formatBookingStatus, getBookingCadenceValue, isRefundIneligible, type RefundStatus } from '@/lib/booking-utils'
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

const refundStatuses: Array<{ label: string; value: RefundStatus }> = [
  { label: 'Refund Pending', value: 'pending_refund' },
  { label: 'Refund Processed', value: 'refund_processed' },
  { label: 'Refund Cancelled', value: 'refund_cancelled' },
]

function formatRefundStatus(status: string) {
  return status.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getDisplayedRefundStatus(booking: { rental_model?: string; status_events?: Array<{ from_status?: string; to_status?: string }> }, cancellation: { refund_status?: string } | undefined) {
  if (cancellation?.refund_status === 'refund_cancelled' && isRefundIneligible(booking.rental_model, booking.status_events)) {
    return 'Not eligible for refund'
  }

  return cancellation?.refund_status ? formatRefundStatus(cancellation.refund_status) : null
}

function getRefundStatusColor(booking: { rental_model?: string; status_events?: Array<{ from_status?: string; to_status?: string }> }, cancellation: { refund_status?: string } | undefined) {
  if (cancellation?.refund_status === 'refund_cancelled' && isRefundIneligible(booking.rental_model, booking.status_events)) {
    return 'bg-[#e92935]/10 text-[#c91f2a]'
  }

  return cancellation?.refund_status === 'refund_processed'
    ? 'bg-[#16a34a]/10 text-[#16a34a]'
    : cancellation?.refund_status === 'pending_refund'
      ? 'bg-[#ffd923]/20 text-[#b8860b]'
      : 'bg-[#e92935]/10 text-[#c91f2a]'
}

export default function MyBookings() {
  const [filter, setFilter] = useState('')
  const [refundFilter, setRefundFilter] = useState<RefundStatus | undefined>()
  const { data: bookings = [], isLoading, isError, refetch } = useMyBookings(filter || undefined, refundFilter)

  return (
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black tracking-[-0.02em] text-[#071f52] sm:text-3xl sm:tracking-[-0.03em]">My Bookings</h1>
          <p className="mt-0.5 text-xs font-medium text-[#071f52]/58 sm:text-sm">Track your upcoming and past rentals.</p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5 bg-[#e92935] text-xs text-white shadow-[0_8px_16px_rgba(233,41,53,0.2)] hover:bg-[#c91f2a] sm:size-lg sm:gap-2 sm:shadow-[0_12px_24px_rgba(233,41,53,0.2)]">
          <Link to="/our-fleet"><ChevronRight size={14} className="sm:hidden" /><ChevronRight size={18} className="hidden sm:block" /> Book a Van</Link>
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0 sm:mt-5">
        <div className="flex gap-1.5 w-max sm:flex-wrap sm:w-auto sm:gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
               onClick={() => {
                 setFilter(s.value)
                 setRefundFilter(undefined)
               }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all sm:px-4 sm:py-2 sm:text-xs ${
                 filter === s.value && !refundFilter
                  ? 'bg-[#071f52] text-white shadow-sm'
                  : 'border border-[#071f52]/14 bg-white text-[#071f52]/58 hover:border-[#071f52]/30 hover:text-[#071f52]'
              }`}
            >
              {s.label}
            </button>
          ))}
          {refundStatuses.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setFilter('')
                setRefundFilter(s.value)
              }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all sm:px-4 sm:py-2 sm:text-xs ${
                refundFilter === s.value
                  ? 'bg-[#071f52] text-white shadow-sm'
                  : 'border border-[#071f52]/14 bg-white text-[#071f52]/58 hover:border-[#071f52]/30 hover:text-[#071f52]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
          {[...Array(4)].map((_, index) => <div key={index} className="h-20 rounded-lg bg-[#071f52]/6 animate-pulse sm:h-24" />)}
        </div>
      ) : isError ? (
        <div className="mt-4 rounded-lg border border-[#e92935]/20 bg-[#e92935]/5 p-8 text-center text-sm font-semibold text-[#b91c1c] sm:mt-6">
          <p>Could not load your bookings. Please try again.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-xl bg-[#071f52] px-4 py-2 text-xs font-bold text-white">Try again</button>
        </div>
      ) : !bookings.length ? (
      <div className="mt-4 rounded-lg border border-[#071f52]/10 bg-white p-8 text-center shadow-[0_4px_16px_rgba(7,31,82,0.04)] sm:mt-6 sm:p-10 sm:shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#f7f9ff] sm:h-16 sm:w-16">
          <CalendarDays size={22} className="text-[#071f52]/24 sm:hidden" />
          <CalendarDays size={28} className="text-[#071f52]/24 hidden sm:block" />
        </div>
        <p className="mt-3 text-xs font-semibold text-[#071f52]/48 sm:mt-4 sm:text-sm">
          {filter === '' ? 'No bookings yet.' : `No "${statuses.find((status) => status.value === filter)?.label}" bookings.`}
        </p>
        <p className="mt-1 text-[11px] font-medium text-[#071f52]/38 sm:text-xs">
          When you book a van, it will appear here with status updates.
        </p>
        <Button asChild size="sm" className="mt-4 gap-1.5 bg-[#071f52] text-xs text-white hover:bg-[#112458] sm:size-lg sm:mt-5 sm:gap-2">
          <Link to="/our-fleet">Browse Fleet</Link>
        </Button>
      </div>
      ) : (
        <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
          {bookings.map((booking: any) => (
            <Link
              key={booking.id}
              to={`/dashboard/bookings/${booking.id}`}
              className="block rounded-lg border border-[#071f52]/10 bg-white p-3.5 shadow-[0_4px_16px_rgba(7,31,82,0.04)] transition-colors hover:border-[#071f52]/25 sm:p-5 sm:shadow-[0_8px_24px_rgba(7,31,82,0.06)]"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#071f52] sm:text-sm">{booking.booking_number}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#071f52]/66 sm:text-sm">{booking.vehicles?.name || 'Vehicle pending'}</p>
                  <p className="mt-0.5 text-[11px] text-[#071f52]/48 sm:text-xs">
                    {new Date(booking.start_at).toLocaleDateString()} {booking.end_at ? `to ${new Date(booking.end_at).toLocaleDateString()}` : ''} · {getBookingCadenceValue(booking)}
                  </p>
                </div>
                  {booking.status === 'canceled' && getDisplayedRefundStatus(booking, booking.cancellation?.[0]) ? (
                    <span className={cn('inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-[11px]', getRefundStatusColor(booking, booking.cancellation[0]))}>
                      {getDisplayedRefundStatus(booking, booking.cancellation[0])}
                    </span>
                  ) : (
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-[11px]', STATUS_COLORS[booking.status])}>
                      {formatBookingStatus(booking.status)}
                    </span>
                  )}
              </div>
              <div className={cn('mt-3 grid gap-2 text-xs sm:mt-4 sm:gap-3 sm:text-sm', booking.status === 'for_review' ? 'sm:grid-cols-1' : 'sm:grid-cols-3')}>
                <div>
                  <p className="text-[10px] font-bold text-[#071f52]/48 sm:text-xs">Total</p>
                  <p className="font-bold text-[#071f52]">{booking.flagged_for_manual_pricing ? 'TBD' : `₱${Number(booking.total_amount || 0).toLocaleString()}.00`}</p>
                </div>
                {booking.status !== 'for_review' && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#071f52]/48 sm:text-xs">Paid</p>
                      <p className="font-bold text-[#16a34a]">₱{Number(booking.paid_amount || 0).toLocaleString()}.00</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#071f52]/48 sm:text-xs">Remaining</p>
                      <p className="font-bold text-[#e92935]">₱{Number(booking.remaining_amount || 0).toLocaleString()}.00</p>
                    </div>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
