import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useVehicleBySlug } from '@/hooks/use-vehicles'
import { CustomerHeader } from '@/components/customer-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Luggage, Settings, Fuel, Gauge } from 'lucide-react'

const specIconMap: Record<string, React.ElementType> = {
  passengers: Users,
  bags: Luggage,
  manual: Settings,
  automatic: Settings,
  diesel: Fuel,
  van: Gauge,
}

export default function VehicleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [rentalType, setRentalType] = useState<'self-drive' | 'with-driver'>('self-drive')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)

  const { data: vehicle, isLoading } = useVehicleBySlug(slug)

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f9ff]">
        {user && <CustomerHeader />}
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
          <div className="mb-6 h-4 w-24 rounded-lg bg-[#071f52]/10" />
          <div className="grid gap-8 lg:grid-cols-[1fr_0.45fr]">
            <div className="aspect-[16/10] rounded-[28px] bg-[#071f52]/10" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded-lg bg-[#071f52]/10" />
              <div className="h-4 w-full rounded-lg bg-[#071f52]/8" />
              <div className="h-24 rounded-lg bg-[#071f52]/6" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-[#071f52]">Vehicle not found</p>
          <Button asChild className="mt-4">
            <Link to="/our-fleet">Back to fleet</Link>
          </Button>
        </div>
      </div>
    )
  }

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const baseTotal = days * vehicle.base_price_per_day
  const driverTotal = rentalType === 'with-driver' ? days * vehicle.driver_rate_per_day : 0
  const grandTotal = baseTotal + driverTotal

  const bookingUrl = `/dashboard/book/${vehicle.id}?type=${rentalType}&start=${startDate}&end=${endDate}`

  const images = vehicle.image_paths?.length ? vehicle.image_paths : ['/van-1.jpg']
  const specs = [
    `${vehicle.passenger_count} Passengers`,
    `${vehicle.bag_count} Bags`,
    vehicle.transmission || 'Manual',
    vehicle.fuel_type || 'Diesel',
    'Van',
  ]

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {user && <CustomerHeader />}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 py-6 sm:py-8">
        <Link to="/our-fleet" className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} />
          Back to fleet
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.45fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-[#071f52]/10 bg-white shadow-[0_12px_40px_rgba(7,31,82,0.08)]">
              <img
                src={images[selectedImage] || images[0]}
                alt={vehicle.name}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${i === selectedImage ? 'border-[#e92935]' : 'border-transparent'}`}
                  >
                    <img src={img} alt={`${vehicle.name} ${i + 1}`} className="h-20 w-28 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[24px] border border-[#071f52]/10 bg-white p-6 shadow-[0_12px_40px_rgba(7,31,82,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">{vehicle.name}</h1>
                  <p className="mt-1 text-sm font-semibold text-[#071f52]/48">{vehicle.plate_number}</p>
                </div>
                {vehicle.is_available && (
                  <Badge className="rounded-full bg-[#16a34a]/10 px-3 py-1 text-xs font-bold text-[#16a34a]">Available</Badge>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-[#071f52]/68">
                {vehicle.description || 'Comfortable van for groups, airport transfers, and long-distance trips.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {specs.map((spec) => {
                  const [count] = spec.split(' ')
                  const key = count.toLowerCase()
                  const Icon = specIconMap[key] || Gauge
                  return (
                    <div key={spec} className="flex items-center gap-1.5 rounded-full bg-[#071f52]/8 px-3 py-1.5 text-[11px] font-bold text-[#071f52]/66">
                      <Icon size={12} />
                      {spec}
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-[#071f52]/8 bg-[#f7f9ff] p-5">
                <h3 className="text-sm font-black text-[#071f52]">Quick Estimate</h3>
                <p className="text-xs font-medium text-[#071f52]/48">Pick dates and rental type for a preview</p>

                <div className="mt-3 flex gap-2 rounded-xl border border-[#071f52]/14 bg-white p-1">
                  {(['self-drive', 'with-driver'] as const).map((type) => (
                    <button
                      key={type} type="button"
                      onClick={() => setRentalType(type)}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        rentalType === type ? 'bg-[#071f52] text-white shadow-sm' : 'text-[#071f52]/58'
                      }`}
                    >
                      {type === 'self-drive' ? 'Self-Drive' : 'With Driver'}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl border border-[#071f52]/14 bg-white px-3 py-2 text-xs font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl border border-[#071f52]/14 bg-white px-3 py-2 text-xs font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                </div>

                {days > 0 && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#071f52]/58">Base ({days}d × ₱{vehicle.base_price_per_day.toLocaleString()})</span>
                      <span className="font-bold">₱{baseTotal.toLocaleString()}.00</span>
                    </div>
                    {rentalType === 'with-driver' && (
                      <div className="flex justify-between">
                        <span className="text-[#071f52]/58">Driver ({days}d × ₱{vehicle.driver_rate_per_day.toLocaleString()})</span>
                        <span className="font-bold">₱{driverTotal.toLocaleString()}.00</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#071f52]/10 pt-1.5 text-sm">
                      <span className="font-black">Total</span>
                      <span className="font-black">₱{grandTotal.toLocaleString()}.00</span>
                    </div>
                  </div>
                )}

                <Button asChild className="mt-4 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">
                  <Link to={bookingUrl}>Book Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>
}
