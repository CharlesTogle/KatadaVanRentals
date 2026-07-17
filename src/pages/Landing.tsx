import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'
import { CustomerHeader } from '@/components/CustomerHeader'
import {
  CalendarCheck,
  ChevronDown,
  Clock3,
  Luggage,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )

    obs.observe(el)
    return () => obs.unobserve(el)
  }, [])

  return { ref, visible }
}

function FadeSection({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useReveal()

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className
      )}
    >
      {children}
    </div>
  )
}

const faqs = [
  {
    question: 'What types of rentals does Katada offer?',
    answer: 'Three models: All In (van, driver, fuel estimate, and toll estimate included), All Out (van and driver only — you handle fuel and toll), and Self Drive (van only — you drive, with optional delivery and recovery fees).',
  },
  {
    question: 'How does pricing work?',
    answer: 'Every booking shows a price breakdown before you confirm. All In quotes include van, driver, diesel estimate, and toll estimate. Self Drive requires a down payment. Admin provides the final quote after reviewing your route.',
  },
  {
    question: 'What documents do I need?',
    answer: 'Self Drive bookings require a Driver\'s License, a valid government ID, and Proof of Billing. These are not required for All In or All Out rentals where Katada provides a driver.',
  },
  {
    question: 'How do I make a booking?',
    answer: 'Create an account, browse the fleet, pick dates and a rental type, fill in your route details, upload any required documents, and submit. Admin reviews your request and confirms the price.',
  },
  {
    question: 'Can I cancel or modify a booking?',
    answer: 'Cancellations depend on the booking status. Bookings in For Review, Awaiting Documents, or Accepted stages can be cancelled. Once a trip has started, cancellations are not available. Contact us for modifications.',
  },
  {
    question: 'How do payments work?',
    answer: 'Payments are manual — bank transfer (BDO) or G-Cash. After submitting your booking, you will receive payment instructions. Upload your receipt and admin verifies it. Remaining balance is due at pickup.',
  },
  {
    question: 'Is there a delivery fee for Self Drive?',
    answer: 'Yes, if you need the van delivered to your location or recovered after the trip, a delivery and recovery fee applies. The amount depends on distance and is shown in your quote before you confirm.',
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.05)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-bold text-[#071f52]">{question}</span>
        <ChevronDown
          size={20}
          className={cn(
            'shrink-0 text-[#071f52]/40 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm leading-6 text-[#071f52]/64">{answer}</p>
        </div>
      )}
    </div>
  )
}

const navLinks = [
  { label: 'Our Fleet', href: '/our-fleet' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Fleet', href: '#fleet' },
  { label: 'Services', href: '#services' },
  { label: 'Why Katada', href: '#why' },
]

const fleet = [
  {
    name: 'Grandia VIP',
    seats: '10 seats',
    price: 'From PHP 6,500/day',
    image: '/van-2.jpg',
    note: 'Captain seats, wide cabin, premium ride for long trips.',
  },
  {
    name: 'Commuter Deluxe',
    seats: '14 seats',
    price: 'From PHP 3,500/day',
    image: '/van-1.jpg',
    note: 'Roomy everyday van for barkadas, teams, and family outings.',
  },
  {
    name: 'Super Grandia',
    seats: '10 seats',
    price: 'From PHP 5,000/day',
    image: '/vehicle-sample.jpg',
    note: 'Quiet cabin and recliners for airport and business transfers.',
  },
]

const services = [
  { title: 'Airport transfers', body: 'Pickup and drop-off for NAIA, hotels, and homes.', icon: Luggage },
  { title: 'Out-of-town trips', body: 'Comfortable vans for Baguio, Tagaytay, Subic, and beyond.', icon: MapPin },
  { title: 'Events and groups', body: 'Shuttle service for weddings, retreats, reunions, and company days.', icon: Users },
  { title: 'Driver included', body: 'Licensed drivers who know the routes and keep the trip steady.', icon: ShieldCheck },
  { title: 'Flexible schedules', body: 'Early call times, late arrivals, and multi-stop itineraries covered.', icon: Clock3 },
]

const proof = [
  { value: '24/7', label: 'trip support' },
  { value: '10-14', label: 'seat options' },
  { value: 'Pasay', label: 'home base' },
]

export default function Landing() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff] text-[#071f52]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {user ? (
        <CustomerHeader />
      ) : (
        <nav className="sticky top-0 z-50 border-b border-[#071f52]/10 bg-[#f7f9ff]/90 backdrop-blur-md">
          <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-5 px-4 sm:px-6">
            <a href="/" className="flex min-w-0 items-center gap-3">
              <img src="/logo.jpg" alt="Katada Transportation Services" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
              <span className="max-w-[165px] text-sm font-extrabold leading-tight tracking-[-0.02em] text-[#071f52] sm:max-w-none sm:text-base">
                Katada Transportation
              </span>
            </a>

            <div className="hidden items-center gap-7 md:flex">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#e92935]">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <a href="/login" className="text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#071f52]">
                Sign in
              </a>
              <Button className="bg-[#e92935] text-white shadow-[0_14px_30px_rgba(233,41,53,0.22)] hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" asChild>
                <a href="/register">Book now</a>
              </Button>
            </div>

            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {mobileOpen && (
            <div className="border-t border-[#071f52]/10 bg-[#f7f9ff] px-4 pb-5 pt-2 md:hidden">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="block border-b border-[#071f52]/10 py-3 text-sm font-bold text-[#071f52]" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </a>
              ))}
              <a href="/login" className="block py-3 text-sm font-bold text-[#071f52]" onClick={() => setMobileOpen(false)}>
                Sign in
              </a>
              <Button className="mt-2 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" asChild>
                <a href="/register" onClick={() => setMobileOpen(false)}>Book now</a>
              </Button>
            </div>
          )}
        </nav>
      )}

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(255,217,35,0.38),transparent_32%),radial-gradient(circle_at_10%_30%,rgba(233,41,53,0.16),transparent_28%)]" />
          <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1180px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
            <div className="max-w-[620px]">
              <div className="mb-5 inline-flex rounded-full border border-[#071f52]/10 bg-white px-4 py-2 text-sm font-bold text-[#071f52] shadow-[0_12px_34px_rgba(7,31,82,0.08)]">
                Pasay City transportation service
              </div>
              <h1 className="text-[2.9rem] font-black leading-[0.98] tracking-[-0.055em] text-[#071f52] sm:text-[4rem] lg:text-[5.35rem]">
                Vans that keep the whole trip calm.
              </h1>
              <p className="mt-5 max-w-[500px] text-lg font-medium leading-8 text-[#071f52]/70">
                Clean vans, careful drivers, clear booking for airport transfers, family trips, and group travel.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="xl" className="bg-[#e92935] text-white shadow-[0_18px_36px_rgba(233,41,53,0.24)] hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" asChild>
                  <a href="/register">Book now</a>
                </Button>
                <Button size="xl" variant="outline" className="border-[#071f52]/15 bg-white text-[#071f52] hover:bg-[#ffd923] hover:text-[#071f52]" asChild>
                  <a href="#fleet">View fleet</a>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[610px] lg:ml-auto">
              <div className="absolute -left-5 top-8 h-28 w-28 rounded-[28px] bg-[#ffd923] sm:-left-8" />
              <div className="absolute -right-2 bottom-10 h-36 w-36 rounded-[32px] bg-[#e92935] sm:-right-7" />
              <div className="relative overflow-hidden rounded-[30px] border-[10px] border-white bg-white shadow-[0_30px_80px_rgba(7,31,82,0.22)]">
                <img src="/vehicle-sample.jpg" alt="Premium Katada van interior with reclining seats" className="aspect-[4/3] h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-5 left-5 right-5 grid grid-cols-3 gap-2 rounded-[24px] border border-white/80 bg-white/92 p-3 shadow-[0_18px_40px_rgba(7,31,82,0.18)] backdrop-blur sm:left-10 sm:right-auto sm:w-[420px]">
                {proof.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-[#f7f9ff] px-3 py-3 text-center">
                    <p className="text-xl font-black tracking-[-0.03em] text-[#071f52]">{item.value}</p>
                    <p className="text-[11px] font-bold text-[#071f52]/58">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FadeSection>
          <section id="fleet" className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-[650px]">
              <h2 className="text-4xl font-black leading-tight tracking-[-0.04em] text-[#071f52] md:text-5xl">
                Pick the van that fits your people.
              </h2>
              <p className="mt-4 max-w-[560px] text-base font-medium leading-7 text-[#071f52]/68">
                Choose by comfort level, group size, and trip distance. We keep the options simple so booking stays fast.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="group overflow-hidden rounded-[30px] bg-[#071f52] text-white shadow-[0_24px_70px_rgba(7,31,82,0.24)]">
                <div className="grid min-h-full gap-0 md:grid-cols-2">
                  <img src={fleet[0].image} alt={`${fleet[0].name} interior`} className="h-full min-h-[320px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <div className="flex flex-col justify-between p-7 sm:p-8">
                    <div>
                      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#ffd923] px-4 py-2 text-sm font-black text-[#071f52]">
                        <Sparkles size={16} aria-hidden="true" />
                        Most comfortable
                      </div>
                      <h3 className="text-3xl font-black tracking-[-0.04em]">{fleet[0].name}</h3>
                      <p className="mt-3 text-base leading-7 text-white/72">{fleet[0].note}</p>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
                      <span className="rounded-full bg-white/12 px-4 py-2">{fleet[0].seats}</span>
                      <span className="rounded-full bg-white/12 px-4 py-2">{fleet[0].price}</span>
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid gap-5">
                {fleet.slice(1).map((van) => (
                  <article key={van.name} className="group grid overflow-hidden rounded-[30px] border border-[#071f52]/10 bg-white shadow-[0_16px_44px_rgba(7,31,82,0.08)] sm:grid-cols-[0.42fr_0.58fr]">
                    <img src={van.image} alt={`${van.name} interior`} className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:h-full" />
                    <div className="p-6">
                      <h3 className="text-2xl font-black tracking-[-0.035em] text-[#071f52]">{van.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#071f52]/64">{van.note}</p>
                      <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-[#071f52]">
                        <span className="rounded-full bg-[#ffd923]/65 px-3 py-2">{van.seats}</span>
                        <span className="rounded-full bg-[#071f52]/8 px-3 py-2">{van.price}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </FadeSection>

        <FadeSection>
          <section id="services" className="bg-[#071f52] px-4 py-20 text-white sm:px-6 md:py-28">
            <div className="mx-auto max-w-[1180px]">
              <div className="max-w-[650px]">
                <h2 className="text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
                  Built for real travel days.
                </h2>
                <p className="mt-4 max-w-[560px] text-base font-medium leading-7 text-white/68">
                  From the first pickup to the last stop, the service is planned around comfort, timing, and clear communication.
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-6">
                {services.map((service, index) => {
                  const Icon = service.icon
                  return (
                    <article
                      key={service.title}
                      className={cn(
                        'rounded-[28px] border border-white/12 p-6 transition-transform duration-300 hover:-translate-y-1',
                        index === 0 && 'bg-[#ffd923] text-[#071f52] md:col-span-3',
                        index === 1 && 'bg-white/15 md:col-span-3',
                        index === 2 && 'bg-[#e92935] md:col-span-2',
                        index === 3 && 'bg-white/15 md:col-span-2',
                        index === 4 && 'bg-white/15 md:col-span-2'
                      )}
                    >
                      <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
                      <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{service.title}</h3>
                      <p className={cn('mt-2 text-sm leading-6', index === 0 ? 'text-[#071f52]/72' : 'text-white/68')}>
                        {service.body}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        </FadeSection>

        <FadeSection>
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
        </FadeSection>

        <FadeSection>
          <section className="px-4 pb-20 sm:px-6 md:pb-28">
            <div className="mx-auto grid max-w-[1180px] overflow-hidden rounded-[34px] bg-[#e92935] text-white shadow-[0_26px_70px_rgba(233,41,53,0.25)] lg:grid-cols-[1fr_0.8fr]">
              <div className="p-8 sm:p-10 lg:p-12">
                <h2 className="max-w-[620px] text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
                  Lock in the van before your travel day gets busy.
                </h2>
                <p className="mt-4 max-w-[520px] text-base font-medium leading-7 text-white/76">
                  Create an account, choose your van, and send the booking request in a few minutes.
                </p>
                <Button size="xl" className="mt-8 bg-[#ffd923] text-[#071f52] shadow-none hover:bg-white focus-visible:ring-white" asChild>
                  <a href="/register">Book now</a>
                </Button>
              </div>
              <img src="/van-1.jpg" alt="Katada van interior seating" className="h-full min-h-[300px] w-full object-cover lg:min-h-full" />
            </div>
          </section>
        </FadeSection>
      </main>

      <FadeSection>
        <section id="faq" className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-6 md:pb-24">
          <h2 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-base font-medium leading-7 text-[#071f52]/68">
            Quick answers about our rentals, pricing, and booking process.
          </p>
          <div className="mt-8 space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} {...faq} />
            ))}
          </div>
        </section>
      </FadeSection>

      <footer className="border-t border-[#071f52]/10 bg-[#f7f9ff] text-[#071f52]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-8 text-sm font-semibold sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Katada Transportation Services" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
            <span>Katada Transportation Services</span>
          </div>
          <div className="flex flex-wrap gap-5 text-[#071f52]/66">
            <a href="#fleet" className="transition-colors hover:text-[#e92935]">Fleet</a>
            <a href="#services" className="transition-colors hover:text-[#e92935]">Services</a>
            <a href="#why" className="transition-colors hover:text-[#e92935]">Why Katada</a>
            <a href="/login" className="transition-colors hover:text-[#e92935]">Sign in</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
