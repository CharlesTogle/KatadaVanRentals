import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useAdminFeedback } from '@/hooks/use-bookings'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
}

export default function AdminUserFeedback() {
  const { data: feedback = [], isLoading } = useAdminFeedback()

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div>
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">User Feedback</h1>
        <p className="mt-1 text-sm text-[#071f52]/58">All customer ratings and written feedback in one place.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {[...Array(4)].map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-[#071f52]/6" />)}
        </div>
      ) : !feedback.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No feedback found.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {feedback.map((entry) => (
            <article key={entry.id} className="rounded-3xl border border-[#071f52]/10 bg-white p-5 shadow-sm shadow-[#071f52]/[0.03]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  {entry.profile_image_path ? (
                    <img
                      src={entry.profile_image_path}
                      alt={entry.customer_name}
                      className="h-14 w-14 rounded-full object-cover ring-1 ring-[#071f52]/10"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#071f52] text-sm font-black text-white">
                      {getInitials(entry.customer_name)}
                    </div>
                  )}

                  <div>
                    <p className="text-base font-black text-[#071f52]">{entry.customer_name}</p>
                    <p className="text-sm text-[#071f52]/48">{entry.customer_email}</p>
                    <div className="mt-2 flex items-center gap-1 text-[#ffd923]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={16} fill={star <= entry.rating ? 'currentColor' : 'none'} />
                      ))}
                      <span className="ml-2 text-xs font-bold uppercase tracking-[0.16em] text-[#071f52]/38">
                        {entry.rating}/5
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-full bg-[#071f52]/6 px-3 py-1 text-xs font-bold text-[#071f52]">
                    Plate: {entry.vehicle_plate}
                  </span>
                  <span className="rounded-full bg-[#071f52]/6 px-3 py-1 text-xs font-bold text-[#071f52]">
                    {formatDate(entry.created_at)}
                  </span>
                  <Link
                    to={`/admin/bookings/${entry.booking_number}`}
                    className="rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0b2f7d]"
                  >
                    View booking
                  </Link>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f7f9ff] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#071f52]/38">Feedback</p>
                <p className="mt-2 text-sm leading-6 text-[#071f52]/78">{entry.feedback || 'No written feedback provided.'}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
