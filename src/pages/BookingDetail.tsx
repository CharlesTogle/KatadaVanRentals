import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, MapPin, CalendarDays, CreditCard, FileText,
  Clock, Star, Send,
} from 'lucide-react'
import { BOOKING_MESSAGES } from '@/constants/booking'

const statusColors: Record<string, string> = {
  'For Review': 'bg-[#ffd923]/20 text-[#b8860b]',
  'Awaiting Documents': 'bg-[#e92935]/10 text-[#c91f2a]',
  'Pending Price Approval': 'bg-[#ffd923]/20 text-[#b8860b]',
  Confirmed: 'bg-[#16a34a]/10 text-[#16a34a]',
  Rejected: 'bg-[#e92935]/10 text-[#c91f2a]',
  Canceled: 'bg-gray-100 text-gray-500',
  'On Trip': 'bg-[#071f52]/10 text-[#071f52]',
  Completed: 'bg-[#16a34a]/10 text-[#16a34a]',
}

const timeline = [
  'For Review', 'Confirmed', 'On Trip', 'Completed',
]

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // ponytail: fetch booking from Supabase by id
  const booking: Record<string, any> = {
    id: id || 'N/A',
    reference: `CR-20260715-${(id || 'XXXXX').toUpperCase()}`,
    vehicle: 'Commuter Deluxe',
    plate: 'NBS4512',
    rentalType: 'Self-Drive',
    status: 'Completed',
    startDate: 'Jul 15, 2026, 8:00 AM',
    endDate: 'Jul 16, 2026, 8:00 AM',
    duration: '1d',
    pickup: '123 Rizal St., Makati City',
    dropoff: '456 Aguinaldo Hwy, Dasmarinas',
    destination: 'Tagaytay City, Cavite',
    purpose: 'Leisure/Vacation',
    notes: '',
    priceBreakdown: [
      { label: 'Base (1d × ₱5,200)', amount: 5200 },
    ],
    total: 5200,
    paid: 520,
    remaining: 4680,
    deposit: 520,
    documents: [
      { name: "Driver's License", status: 'Verified' },
      { name: 'Valid ID', status: 'Verified' },
      { name: 'Proof of Billing', status: 'Submitted' },
    ],
  }

  const handleSubmitFeedback = () => {
    // ponytail: save feedback to Supabase
    setSubmitted(true)
  }

  const currentStep = timeline.indexOf(booking.status)

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 sm:py-8">
        <button onClick={() => navigate('/dashboard?tab=my-bookings')} className="mb-4 flex items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back to bookings
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">{booking.reference}</h1>
            <p className="mt-1 text-sm font-medium text-[#071f52]/58">{booking.vehicle} · {booking.plate}</p>
          </div>
          <Badge className={`${statusColors[booking.status]} rounded-full px-4 py-1.5 text-xs font-bold`}>
            {booking.status}
          </Badge>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.6fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
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
                    }`}>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <DetailCard icon={CalendarDays} title="Schedule">
              <Row label="Pickup" value={booking.startDate} />
              <Row label="Drop-off" value={booking.endDate} />
              <Row label="Duration" value={booking.duration} />
            </DetailCard>

            <DetailCard icon={MapPin} title="Route">
              <Row label="Pickup" value={booking.pickup} />
              <Row label="Drop-off" value={booking.dropoff} />
              <Row label="Destination" value={booking.destination} />
              <Row label="Purpose" value={booking.purpose} />
            </DetailCard>

            <DetailCard icon={FileText} title="Documents">
              {booking.documents.map((doc: any) => (
                <div key={doc.name} className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-semibold text-[#071f52]">{doc.name}</span>
                  <span className={`text-xs font-bold ${
                    doc.status === 'Verified' ? 'text-[#16a34a]' : 'text-[#ffd923]'
                  }`}>{doc.status}</span>
                </div>
              ))}
            </DetailCard>

            {booking.status === 'Completed' && !submitted && (
              <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
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
            <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
              <h3 className="flex items-center gap-2 text-base font-black text-[#071f52]">
                <CreditCard size={16} /> Price Breakdown
              </h3>
              <div className="mt-3 space-y-1.5 text-sm">
                {booking.priceBreakdown.map((item: any) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-[#071f52]/66">{item.label}</span>
                    <span className="font-bold">₱{item.amount.toLocaleString()}.00</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#071f52]/10 pt-1.5 text-base">
                  <span className="font-black">Total</span>
                  <span className="font-black">₱{booking.total.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#071f52]/58">Paid</span>
                  <span className="font-bold text-[#16a34a]">₱{booking.paid.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#071f52]/58">Remaining</span>
                  <span className="font-bold text-[#e92935]">₱{booking.remaining.toLocaleString()}.00</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 text-sm" asChild>
                <a href="#"><FileText size={14} /> Invoice</a>
              </Button>
              {(booking.status === 'Confirmed' || booking.status === 'For Review') ? (
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

function DetailCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
      <h2 className="flex items-center gap-2 text-base font-black text-[#071f52]">
        <Icon size={16} /> {title}
      </h2>
      <div className="mt-2 divide-y divide-[#071f52]/6">
        {children}
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
