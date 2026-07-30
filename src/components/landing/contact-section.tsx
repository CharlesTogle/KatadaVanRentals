import { Mail, MapPin, Phone } from 'lucide-react'
import { useBusinessInfo } from '@/hooks/use-business-info'

export function ContactSection() {
  const business = useBusinessInfo()

  return (
    <section id="contact" className="px-4 pb-16 sm:px-6 md:pb-24">
      <div className="mx-auto grid max-w-[1180px] gap-6 rounded-[34px] border border-[#071f52]/10 bg-white p-6 shadow-[0_18px_48px_rgba(7,31,82,0.08)] sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e92935]">Contact</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">
            Reach Katada before the trip starts.
          </h2>
          <p className="mt-4 max-w-[34rem] text-base font-medium leading-7 text-[#071f52]/68">
            Ask about schedules, pickup areas, requirements, or custom routes. We keep the answers simple.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <a href={`tel:${business.support_phone}`} className="rounded-[24px] bg-[#f7f9ff] px-5 py-5 transition-colors hover:bg-[#eef3ff]">
            <Phone size={18} className="text-[#e92935]" />
            <p className="mt-4 text-sm font-bold text-[#071f52]/48">Phone</p>
            <p className="mt-1 text-base font-black tracking-[-0.02em] text-[#071f52]">{business.support_phone}</p>
          </a>

          <a href={`mailto:${business.support_email}`} className="rounded-[24px] bg-[#f7f9ff] px-5 py-5 transition-colors hover:bg-[#eef3ff]">
            <Mail size={18} className="text-[#e92935]" />
            <p className="mt-4 text-sm font-bold text-[#071f52]/48">Email</p>
            <p className="mt-1 text-base font-black tracking-[-0.02em] text-[#071f52]">{business.support_email}</p>
          </a>

          <div className="rounded-[24px] bg-[#f7f9ff] px-5 py-5">
            <MapPin size={18} className="text-[#e92935]" />
            <p className="mt-4 text-sm font-bold text-[#071f52]/48">Base</p>
            <p className="mt-1 text-base font-black tracking-[-0.02em] text-[#071f52]">{business.business_address}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
