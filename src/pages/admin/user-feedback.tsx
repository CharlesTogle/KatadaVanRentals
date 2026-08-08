import { Link } from 'react-router-dom'
import { Star, Check } from 'lucide-react'
import { useAdminFeedback, useSetFeedbackHomepageVisibility } from '@/hooks/use-bookings'
import { toast } from '@/lib/toast'

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
  const { data: feedback = [], isLoading, error } = useAdminFeedback()
  const { mutate: setHomepageVisibility, isPending } = useSetFeedbackHomepageVisibility()
  const homepageCount = feedback.filter((entry) => entry.display_on_homepage).length

  const toggleHomepage = (id: string, displayOnHomepage: boolean) => {
    setHomepageVisibility({ id, displayOnHomepage }, {
      onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not update homepage display.'),
    })
  }

  return (
    <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div>
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">User Feedback</h1>
        <p className="mt-1 text-sm text-[#071f52]/58">All customer ratings and written feedback in one place.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {[...Array(4)].map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-[#071f52]/6" />)}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-[#e92935]/20 bg-[#e92935]/5 p-8 text-center text-sm font-semibold text-[#b91c1c]">
          Could not load feedback. Please try again.
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
                  {entry.booking_number ? (
                    <Link
                      to={`/admin/bookings/${entry.booking_number}`}
                      className="rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0b2f7d]"
                    >
                      View booking
                    </Link>
                  ) : (
                    <span className="rounded-xl bg-[#071f52]/6 px-4 py-2 text-sm font-bold text-[#071f52]/58">
                      Booking deleted
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-[#f7f9ff] px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#071f52]/38">Feedback</p>
                <p className="mt-2 text-sm leading-6 text-[#071f52]/78">{entry.feedback || 'No written feedback provided.'}</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-bold text-[#071f52]">
                  <input
                    type="checkbox"
                    checked={entry.display_on_homepage}
                    disabled={isPending || (!entry.display_on_homepage && homepageCount >= 10)}
                    onChange={(event) => toggleHomepage(entry.id, event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#071f52]/20 bg-white text-white transition-colors peer-checked:border-[#071f52] peer-checked:bg-[#071f52] peer-focus-visible:ring-2 peer-focus-visible:ring-[#ffd923]">
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  </span>
                  Display on homepage
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
