import { useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useHomepageTestimonials } from '@/hooks/use-bookings'

function truncateFeedback(feedback: string) {
  return feedback.length > 150 ? `${feedback.slice(0, 147)}...` : feedback
}

export function TestimonialsSection() {
  const { data: testimonials = [], isLoading } = useHomepageTestimonials()
  const [activeIndex, setActiveIndex] = useState(0)

  if (!isLoading && !testimonials.length) return null

  const active = testimonials[activeIndex] || testimonials[0]
  const goTo = (index: number) => setActiveIndex((index + testimonials.length) % testimonials.length)

  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="bg-[#071f52] text-white">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:items-end md:py-28">
        <div>
          <Quote className="text-[#ffd923]" size={42} strokeWidth={1.6} aria-hidden="true" />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#ffd923]">Guest notes</p>
          <h2 id="testimonials-heading" className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            Good trips are worth sharing.
          </h2>
          <p className="mt-4 max-w-md text-base font-medium leading-7 text-white/65">
            A few words from customers who brought their next trip with Katada.
          </p>
        </div>

        <div aria-live="polite" className="relative min-h-[260px] rounded-[30px] bg-white p-7 text-[#071f52] shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-10">
          {isLoading ? (
            <div className="animate-pulse space-y-5">
              <div className="h-5 w-32 rounded bg-[#071f52]/10" />
              <div className="h-24 rounded bg-[#071f52]/10" />
              <div className="h-5 w-40 rounded bg-[#071f52]/10" />
            </div>
          ) : (
            <>
              <div className="flex gap-1 text-[#ffd923]" aria-label={`${active.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={17} fill={star <= active.rating ? 'currentColor' : 'none'} aria-hidden="true" />
                ))}
              </div>
              <blockquote className="mt-6 text-xl font-bold leading-8 tracking-[-0.02em] sm:text-2xl">
                {active.feedback ? `“${truncateFeedback(active.feedback)}”` : `Rated this trip ${active.rating}/5.`}
              </blockquote>
              <div className="mt-8 flex items-center gap-3">
                {active.profile_image_path ? (
                  <img src={active.profile_image_path} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffd923] text-sm font-black">
                    {active.customer_name.charAt(0)}
                  </div>
                )}
                <cite className="not-italic text-sm font-black">{active.customer_name}</cite>
              </div>
              {testimonials.length > 1 && (
                <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#071f52]/10 pt-5">
                  <div className="flex gap-2" role="tablist" aria-label="Testimonials">
                    {testimonials.map((testimonial, index) => (
                      <button
                        key={testimonial.id}
                        type="button"
                        role="tab"
                        aria-selected={index === activeIndex}
                        aria-label={`Show testimonial ${index + 1}`}
                        onClick={() => goTo(index)}
                        className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#071f52] ${index === activeIndex ? 'w-7 bg-[#071f52]' : 'w-2 bg-[#071f52]/20'}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Previous testimonial" className="rounded-full border border-[#071f52]/15 p-2 transition-colors hover:bg-[#071f52]/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#071f52]">
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Next testimonial" className="rounded-full border border-[#071f52]/15 p-2 transition-colors hover:bg-[#071f52]/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#071f52]">
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
