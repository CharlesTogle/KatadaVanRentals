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
import { ArrowLeft, ChevronLeft, ChevronRight, Users, Luggage, Settings, Fuel, Gauge } from 'lucide-react'

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
      <div className="w-full px-3 py-4 sm:px-5 sm:py-6 animate-pulse">
        <div className="mb-4 h-4 w-20 rounded bg-[#071f52]/10 sm:mb-6" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,0.58fr)] sm:gap-8">
          <div className="aspect-[16/10] rounded-lg bg-[#071f52]/10 sm:rounded-[28px]" />
          <div className="space-y-3 sm:space-y-4">
            <div className="h-6 w-3/4 rounded bg-[#071f52]/10 sm:h-8" />
            <div className="h-3 w-full rounded bg-[#071f52]/8 sm:h-4" />
            <div className="h-20 rounded bg-[#071f52]/6 sm:h-24" />
          </div>
        </div>
      </div>
    )

    return inCustomerShell
      ? <CustomerShellFrame>{loadingContent}</CustomerShellFrame>
      : <div className="min-h-[100dvh] bg-[#f7f9ff]"><AppHeader /><div className="mx-auto max-w-[1180px]">{loadingContent}</div></div>
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-bold text-[#071f52] sm:text-lg">Vehicle not found</p>
          <Button asChild size="sm" className="mt-3 text-xs sm:mt-4">
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
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <Link to="/our-fleet" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#071f52]/60 transition-colors hover:text-[#e92935] sm:mb-6 sm:gap-2 sm:text-sm">
        <ArrowLeft size={14} className="sm:hidden" />
        <ArrowLeft size={16} className="hidden sm:block" />
        Back to fleet
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,0.58fr)] sm:gap-8">
        <div className="space-y-3 sm:space-y-4">
          <div className="relative overflow-hidden rounded-lg border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.06)] sm:rounded-[28px] sm:shadow-[0_12px_40px_rgba(7,31,82,0.08)]">
            <img
              src={images[selectedImage] || images[0]}
              alt={vehicle.name}
              className="aspect-[16/10] w-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => setSelectedImage((index) => (index - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-[#071f52]/78 p-2 text-white transition-colors hover:bg-[#071f52] sm:left-4 sm:p-2.5"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setSelectedImage((index) => (index + 1) % images.length)}
                  className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-[#071f52]/78 p-2 text-white transition-colors hover:bg-[#071f52] sm:right-4 sm:p-2.5"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto sm:gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:rounded-2xl ${i === selectedImage ? 'border-[#e92935]' : 'border-transparent'}`}
                >
                  <img src={img} alt={`${vehicle.name} ${i + 1}`} className="h-16 w-24 object-cover sm:h-20 sm:w-28" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)] sm:rounded-[24px] sm:p-6 sm:shadow-[0_12px_40px_rgba(7,31,82,0.08)]">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div>
                <h1 className="text-lg font-black tracking-[-0.02em] text-[#071f52] sm:text-2xl sm:tracking-[-0.03em]">{vehicle.name}</h1>
                <p className="mt-0.5 text-xs font-semibold text-[#071f52]/48 sm:text-sm">{vehicle.plate_number}</p>
              </div>
              {vehicle.is_available && (
                <span className="rounded-full bg-[#16a34a]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#16a34a] sm:px-3 sm:py-1 sm:text-xs">Available</span>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-[#071f52]/68 sm:mt-4 sm:text-sm sm:leading-6">
              {vehicle.description || 'Comfortable van for groups, airport transfers, and long-distance trips.'}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
              {specs.map((spec) => {
                const [count] = spec.split(' ')
                const key = count.toLowerCase()
                const Icon = specIconMap[key] || Gauge
                return (
                  <div key={spec} className="flex items-center gap-1 rounded-full bg-[#071f52]/8 px-2.5 py-1 text-[10px] font-bold text-[#071f52]/66 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]">
                    <Icon size={10} className="sm:hidden" />
                    <Icon size={12} className="hidden sm:block" />
                    {spec}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 rounded-lg border border-[#071f52]/8 bg-[#f7f9ff] p-4 sm:mt-6 sm:rounded-2xl sm:p-5">
              <h3 className="text-xs font-black text-[#071f52] sm:text-sm">Booking</h3>
              <p className="mt-1 text-xs leading-5 text-[#071f52]/58 sm:text-sm sm:leading-6">
                Continue to the dedicated booking page to choose dates, rental type, pickup details, and payment method.
              </p>

              <Button asChild className="mt-3 w-full bg-[#e92935] text-xs text-white hover:bg-[#c91f2a] sm:mt-4 sm:size-lg" size="sm">
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
    : <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}><AppHeader /><div className="mx-auto max-w-[1180px]">{content}</div></div>
}
