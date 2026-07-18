import { Sparkles } from 'lucide-react'
import { fleet } from '@/data/landing'

export function FleetSection() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 md:py-28">
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
    </div>
  )
}
