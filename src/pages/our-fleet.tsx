import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useVehicles } from '@/hooks/use-vehicles'
import { CustomerHeader } from '@/components/customer-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Calendar, ArrowRight } from 'lucide-react'

export default function OurFleet() {
  const { user } = useAuth()
  const [pickup, setPickup] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: vehicles = [], isLoading } = useVehicles()

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {user && <CustomerHeader />}
      <div className={`mx-auto max-w-[1180px] px-4 sm:px-6 ${user ? 'py-6 sm:py-8' : 'py-10 sm:py-14'}`}>
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Browse Vehicles</h1>
          <p className="mt-3 text-base font-medium leading-7 text-[#071f52]/68">Find the perfect vehicle for your trip</p>
        </div>

        <div className="mb-10 rounded-[24px] border border-[#071f52]/10 bg-white p-5 shadow-[0_12px_40px_rgba(7,31,82,0.08)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#071f52]/60">PICK-UP LOCATION</label>
              <div className="relative">
                <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
                <input value={pickup} onChange={(e) => setPickup(e.target.value)}
                  placeholder="City or address…"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] py-2.5 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#071f52]/60">PICK-UP DATE & TIME</label>
              <div className="relative">
                <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] py-2.5 pl-9 pr-4 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#071f52]/60">DROP-OFF DATE & TIME</label>
              <div className="relative">
                <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] py-2.5 pl-9 pr-4 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2 bg-[#e92935] text-white hover:bg-[#c91f2a]">
                <Search size={16} /> Search
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-[28px] border border-[#071f52]/10 bg-white p-0">
                <div className="aspect-[4/3] w-full rounded-t-[28px] bg-[#071f52]/10" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 rounded-lg bg-[#071f52]/10" />
                  <div className="h-4 w-full rounded-lg bg-[#071f52]/8" />
                  <div className="h-8 rounded-lg bg-[#071f52]/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => {
              const image = v.image_paths?.[0] || '/van-1.jpg'
              return (
                <article
                  key={v.id}
                  className="group overflow-hidden rounded-[28px] border border-[#071f52]/10 bg-white shadow-[0_14px_40px_rgba(7,31,82,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(7,31,82,0.14)]"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={image}
                      alt={v.name}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                    <Badge className="absolute left-3 top-3 rounded-full bg-[#071f52] px-3 py-1.5 text-xs font-bold text-white">
                      Available
                    </Badge>
                    <Badge className="absolute right-3 top-3 rounded-full bg-[#ffd923]/90 px-3 py-1.5 text-xs font-bold text-[#071f52]">
                      Van
                    </Badge>
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="text-xl font-black tracking-[-0.03em] text-[#071f52]">{v.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['Aircon', `${v.passenger_count} Seats`, 'Diesel'].map((f) => (
                        <span key={f} className="rounded-full bg-[#071f52]/8 px-3 py-1 text-[11px] font-bold text-[#071f52]/66">
                          {f}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-bold text-[#071f52]/48">Self-Drive & Driver</p>
                    <div className="mt-4 flex items-center justify-between border-t border-[#071f52]/8 pt-4">
                      <div>
                        <span className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">₱{v.base_price_per_day.toLocaleString()}</span>
                        <span className="text-sm font-bold text-[#071f52]/48">/day</span>
                      </div>
                      <Button asChild className="gap-1.5 bg-[#071f52] text-white hover:bg-[#112458]">
                        <Link to={`/our-fleet/${v.slug}`}>
                          View <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
