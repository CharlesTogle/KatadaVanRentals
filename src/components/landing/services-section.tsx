import { cn } from '@/lib/utils'
import { services } from '@/data/landing'
import { Luggage, MapPin, Users, ShieldCheck, Clock3 } from 'lucide-react'

const iconMap: Record<string, typeof Luggage> = {
  Luggage, MapPin, Users, ShieldCheck, Clock3,
}

export function ServicesSection() {
  return (
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
            const Icon = iconMap[service.icon]
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
  )
}
