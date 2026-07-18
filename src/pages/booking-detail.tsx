import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { useBooking } from '@/hooks/use-bookings'
import { useVehicleById } from '@/hooks/use-vehicles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, MapPin, CalendarDays, CreditCard, FileText,
  Clock, Star, Send,
} from 'lucide-react'
import { BOOKING_MESSAGES } from '@/constants/booking'
import { STATUS_COLORS } from '@/config/constants'
import { BookingSection } from '@/components/booking/booking-section'

const timeline = ['for_review', 'confirmed', 'on_trip', 'completed']

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: booking, isLoading: loading } = useBooking(id)
  const { data: vehicle } = useVehicleById(booking?.vehicle_id)

  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmitFeedback = async () => {
    if (!booking || !user) return
    const { error } = await supabase.from('booking_feedback').insert({
      booking_id: booking.id,
      customer_id: user.id,
      vehicle_id: booking.vehicle_id,
      rating,
      feedback: feedback || null,
    })
    if (!error) setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f9ff] animate-pulse">
        <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 sm:py-8 space-y-6">
          <div className="h-4 w-24 rounded-lg bg-[#071f52]/10" />
          <div className="h-8 w-64 rounded-lg bg-[#071f52]/10" />
          <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-[#071f52]/6" />)}
            </div>
            <div className="h-48 rounded-2xl bg-[#071f52]/6" />
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f9ff]">
        <p className="text-lg font-bold text-[#071f52]">Booking not found</p>
      </div>
    )
  }

  const currentStep = timeline.indexOf(booking.status)
  const displayStatus = booking.status.replace(/_/g, ' ')
  const statusKey = booking.status

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 sm:py-8">
        <button onClick={() => navigate('/dashboard?tab=my-bookings')} className="mb-4 flex items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back to bookings
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">{booking.booking_number}</h1>
            <p className="mt-1 text-sm font-medium text-[#071f52]/58">{vehicle?.name ?? ''}</p>
          </div>
          <Badge className={`${STATUS_COLORS[statusKey] || 'bg-gray-100 text-gray-500'} rounded-full px-4 py-1.5 text-xs font-bold`}>
            {displayStatus}
          </Badge>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.6fr]">
          <div className="space-y-6">
            <div className="card">
              <h2 className="flex items-center gap-2 text-base font-black text-[#071f52]">
                <Clock size={16} /> Status Timeline
              </h2>
              <div className="mt-4 flex items-start gap-2">
                {timeline.map((step, i) => (
                  <div key={step} className="flex flex-1 flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                      i <= currentStep ? 'bg-[#071f52] text-white' : 'bg-[#071f52]/10 text-[#071f52]/30'
                    }`}>
                      {i + 1}
                    </div>
                    <p className={`mt-1 text-center text-[10px] font-bold leading-tight ${
                      i <= currentStep ? 'text-[#071f52]' : 'text-[#071f52]/30'
                    }`}>{step.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            </div>

            <BookingSection title="Schedule" icon={CalendarDays} contentClassName="divide-y divide-[#071f52]/6">
              <Row label="Pickup" value={new Date(booking.start_at).toLocaleString()} />
              <Row label="Drop-off" value={booking.end_at ? new Date(booking.end_at).toLocaleString() : '—'} />
              <Row label="Duration" value={`${booking.duration_days}d`} />
            </BookingSection>

            <BookingSection title="Route" icon={MapPin} contentClassName="divide-y divide-[#071f52]/6">
              <Row label="Pickup" value={booking.pickup_location || '—'} />
              <Row label="Drop-off" value={booking.dropoff_location || '—'} />
              <Row label="Destination" value={booking.destination || '—'} />
              <Row label="Purpose" value={booking.purpose_of_travel || '—'} />
            </BookingSection>

            {booking.status === 'completed' && !submitted && (
              <div className="card">
                <h2 className="flex items-center gap-2 text-base font-black text-[#071f52]">
                  <Star size={16} /> Leave a Review
                </h2>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)}
                      className={`transition-colors ${star <= rating ? 'text-[#ffd923]' : 'text-[#071f52]/20'}`}
                    >
                      <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your experience with this trip…"
                  className="mt-3 block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  rows={3}
                />
                <Button onClick={handleSubmitFeedback} disabled={!rating}
                  className="mt-3 w-full gap-2 bg-[#071f52] text-white hover:bg-[#112458]"
                  size="sm"
                >
                  <Send size={14} /> Submit Review
                </Button>
              </div>
            )}

            {submitted && (
              <div className="rounded-2xl border border-[#16a34a]/20 bg-[#16a34a]/8 p-5 text-center">
                <p className="text-sm font-bold text-[#16a34a]">{BOOKING_MESSAGES.success.review_submitted}</p>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="card">
              <h3 className="flex items-center gap-2 text-base font-black text-[#071f52]">
                <CreditCard size={16} /> Price Breakdown
              </h3>
              <div className="mt-3 space-y-1.5 text-sm">
                {(booking.price_line_items as Array<{ label: string; amount: number }>).map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-[#071f52]/66">{item.label}</span>
                    <span className="font-bold">₱{item.amount.toLocaleString()}.00</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#071f52]/10 pt-1.5 text-base">
                  <span className="font-black">Total</span>
                  <span className="font-black">₱{booking.total_amount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#071f52]/58">Paid</span>
                  <span className="font-bold text-[#16a34a]">₱{booking.paid_amount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#071f52]/58">Remaining</span>
                  <span className="font-bold text-[#e92935]">₱{booking.remaining_amount.toLocaleString()}.00</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 text-sm" asChild>
                <a href="#"><FileText size={14} /> Invoice</a>
              </Button>
              {(booking.status === 'confirmed' || booking.status === 'for_review') ? (
                <Button variant="outline" className="flex-1 gap-2 text-sm text-[#e92935] border-[#e92935]/30 hover:bg-[#e92935]/8">
                  Cancel Booking
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-bold text-[#071f52]/48">{label}</span>
      <span className="text-sm font-semibold text-[#071f52]">{value}</span>
    </div>
  )
}
