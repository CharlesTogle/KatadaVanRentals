import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useVehicleBySlug } from '@/hooks/use-vehicles'
import { AppHeader } from '@/components/app-header'
import { CustomerShellFrame } from '@/components/customer-shell-frame'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { isAdminRole } from '@/lib/rbac'
import { loadBookingDateSelection } from '@/lib/booking-date-storage'
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
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id)
  const [selectedImage, setSelectedImage] = useState(0)

  const { data: vehicle, isLoading: vehicleLoading } = useVehicleBySlug(slug)
  const inCustomerShell = !!user && !isAdminRole(profile?.role)
  const isLoading = vehicleLoading || (!!user && profileLoading)

  if (isLoading) {
    const loadingContent = (
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
        <div className="mb-6 h-4 w-24 rounded-lg bg-[#071f52]/10" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(380px,0.58fr)]">
          <div className="aspect-[16/10] rounded-[28px] bg-[#071f52]/10" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded-lg bg-[#071f52]/10" />
            <div className="h-4 w-full rounded-lg bg-[#071f52]/8" />
            <div className="h-24 rounded-lg bg-[#071f52]/6" />
          </div>
        </div>
      </div>
    )

    return inCustomerShell
      ? <CustomerShellFrame>{loadingContent}</CustomerShellFrame>
      : <div className="min-h-[100dvh] bg-[#f7f9ff]"><AppHeader />{loadingContent}</div>
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

  const bookingDateSelection = loadBookingDateSelection()
  const bookingParams = new URLSearchParams()

  if (bookingDateSelection?.start) bookingParams.set('start', bookingDateSelection.start)
  if (bookingDateSelection?.end) bookingParams.set('end', bookingDateSelection.end)

  const bookingPath = `/dashboard/book/${vehicle.id}${bookingParams.size ? `?${bookingParams.toString()}` : ''}`
  const bookingUrl = user
    ? bookingPath
    : `/login?redirect=${encodeURIComponent(bookingPath)}`

  const images = vehicle.image_paths?.length ? vehicle.image_paths : ['/van-1.jpg']
  const specs = [
    `${vehicle.passenger_count} Passengers`,
    `${vehicle.bag_count} Bags`,
    vehicle.transmission || 'Manual',
    vehicle.fuel_type || 'Diesel',
    'Van',
  ]

  const content = (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <Link to="/our-fleet" className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
        <ArrowLeft size={16} />
        Back to fleet
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(380px,0.58fr)]">
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
              <h3 className="text-sm font-black text-[#071f52]">Booking</h3>
              <p className="mt-1 text-sm leading-6 text-[#071f52]/58">
                Continue to the dedicated booking page to choose dates, rental type, pickup details, and payment method.
              </p>

              <Button asChild className="mt-4 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">
                <Link to={bookingUrl}>{user ? 'Continue to booking' : 'Sign in to book'}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return inCustomerShell
    ? <CustomerShellFrame>{content}</CustomerShellFrame>
    : <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}><AppHeader />{content}</div>
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>
}
