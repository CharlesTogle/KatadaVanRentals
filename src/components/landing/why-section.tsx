import { CalendarCheck, ShieldCheck } from 'lucide-react'

export function WhySection() {
  return (
    <section id="why" className="mx-auto grid max-w-[1180px] gap-8 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[30px] bg-[#ffd923] p-8 text-[#071f52] shadow-[0_18px_50px_rgba(255,217,35,0.28)]">
        <CalendarCheck size={34} strokeWidth={1.8} aria-hidden="true" />
        <h2 className="mt-6 text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
          Easy booking. Steady service.
        </h2>
        <p className="mt-4 text-base font-semibold leading-7 text-[#071f52]/72">
          Send the date, route, passenger count, and preferred van. Katada confirms the best fit before the trip.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['Clear rates', 'Pricing is shared before confirmation, with route and schedule details included.'],
          ['Clean interiors', 'Vans are cleaned before trips, with comfortable seating for long rides.'],
          ['Route-ready drivers', 'Drivers know common pickup points, highway routes, and airport timing.'],
          ['Trip support', 'Need to adjust pickup or stops? Message the team and keep the trip moving.'],
        ].map(([title, body]) => (
          <article key={title} className="rounded-[28px] border border-[#071f52]/10 bg-white p-6 shadow-[0_14px_40px_rgba(7,31,82,0.07)]">
            <ShieldCheck className="text-[#e92935]" size={24} strokeWidth={1.8} aria-hidden="true" />
            <h3 className="mt-5 text-xl font-black tracking-[-0.03em] text-[#071f52]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#071f52]/64">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
