import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useBookingStore } from '@/store/booking-store'
import { useVehicleById } from '@/hooks/use-vehicles'
import { useProfile } from '@/hooks/use-profile'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { useCustomerDocuments } from '@/hooks/use-documents'
import { hasRequiredSelfDriveDocuments } from '@/lib/booking-utils'
import { ArrowLeft, Info, ShieldCheck, CreditCard } from 'lucide-react'
import { BookingSection, MapPinIcon } from '@/components/booking/booking-section'
import { RentalDetailsFields } from '@/components/booking/rental-details-fields'
import { CustomerInfoFields } from '@/components/booking/customer-info-fields'
import { AddressFields } from '@/components/booking/address-fields'
import { LocationsFields } from '@/components/booking/locations-fields'
import { PaymentFields } from '@/components/booking/payment-fields'
import { PriceSummary } from '@/components/booking/price-summary'
import { BookingFormSkeleton } from '@/components/booking/booking-form-skeleton'
import { useEffect } from 'react'

function generateBookingNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = crypto.randomUUID().slice(0, 4).toUpperCase()
  return `CR-${y}${m}${d}-${rand}`
}

function formatRentalLabel(rentalType: 'self-drive' | 'with-driver') {
  return rentalType === 'self-drive' ? 'Self Drive' : 'All Out'
}

export default function BookingForm() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''

  const locations = useBookingStore((s) => s.locations)
  const purpose = useBookingStore((s) => s.purpose)
  const notes = useBookingStore((s) => s.notes)
  const payment = useBookingStore((s) => s.payment)
  const receiptFile = useBookingStore((s) => s.receiptFile)
  const submitting = useBookingStore((s) => s.submitting)
  const error = useBookingStore((s) => s.error)
  const setProfile = useBookingStore((s) => s.setProfile)
  const setAddress = useBookingStore((s) => s.setAddress)
  const setSubmitting = useBookingStore((s) => s.setSubmitting)
  const setError = useBookingStore((s) => s.setError)

  const vehicleQuery = useVehicleById(vehicleId)
  const profileQuery = useProfile(user?.id)
  const documentsQuery = useCustomerDocuments(user?.id)

  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data
      setProfile({
        first_name: p.first_name || user?.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: p.last_name || user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: p.email || user?.email || '',
        mobile: p.mobile || '+63 ',
      })
      setAddress({
        address: p.address || '',
        city: p.city || '',
        province: p.province || '',
        zip: p.zip_code || '',
        country: p.country || 'Philippines',
      })
    } else if (user && !profileQuery.isLoading) {
      setProfile({
        first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        mobile: '+63 ',
      })
    }
  }, [profileQuery.data, profileQuery.isLoading, user, setProfile, setAddress])

  const vehicle = vehicleQuery.data ?? null
  const loading = vehicleQuery.isLoading || (!!user && profileQuery.isLoading)
  const selfDriveDocumentsReady = hasRequiredSelfDriveDocuments(documentsQuery.data || [])
  const selfDriveBlocked = rentalType === 'self-drive' && !selfDriveDocumentsReady

  if (!vehicleId || (!loading && !vehicle)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg font-bold text-[#071f52]">Vehicle not found</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <BookingFormSkeleton />
      </div>
    )
  }

  const startDate = startParam ? new Date(startParam) : null
  const endDate = endParam ? new Date(endParam) : null
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !vehicle) return
    if (selfDriveBlocked) {
      setError('Self Drive requires your driver\'s license, valid ID, and proof of billing before submission.')
      return
    }
    setSubmitting(true)
    setError('')

    const rentalModel = rentalType === 'self-drive' ? 'self_drive' : 'all_out'
    const idempotencyKey = crypto.randomUUID()

    const { data: booking, error: bookingError } = await supabase.rpc(
      'create_booking',
      {
        p_booking_number: generateBookingNumber(),
        p_vehicle_id: vehicle.id,
        p_rental_model: rentalModel,
        p_start_at: startDate?.toISOString() || new Date().toISOString(),
        p_end_at: endDate?.toISOString() || null,
        p_duration_days: days || 1,
        p_pickup_location: locations.pickup || null,
        p_dropoff_location: locations.dropoff || null,
        p_destination: locations.destination || null,
        p_purpose_of_travel: purpose || null,
        p_notes: notes || null,
        p_idempotency_key: idempotencyKey,
      },
    )

    if (bookingError) {
      setError(showError(bookingError))
      setSubmitting(false)
      return
    }

    if (rentalType === 'self-drive' && payment.reference) {
      let receiptPath: string | null = null
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop()
        const path = `payment-receipts/${booking.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('payment-receipts')
          .upload(path, receiptFile)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('payment-receipts').getPublicUrl(path)
          receiptPath = publicUrl
        }
      }

      await supabase.from('payments').insert({
        booking_id: booking.id,
        payment_method_id: payment.method,
        channel: 'bank_transfer',
        status: 'submitted',
        amount: parseFloat(payment.amount) || booking.deposit_amount,
        reference_number: payment.reference,
        receipt_path: receiptPath,
        submitted_by: user.id,
      })
    }

    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: profileQuery.data?.email || user.email,
          subject: `Booking received: ${booking.booking_number}`,
          text: [
            `Hi ${(profileQuery.data?.first_name || user.user_metadata?.full_name || 'Customer')},`,
            '',
            'Your booking has been received and is now under review.',
            '',
            `Booking Number: ${booking.booking_number}`,
            `Vehicle: ${vehicle.name}`,
            `Rental Type: ${formatRentalLabel(rentalType)}`,
            `Pickup: ${startDate?.toLocaleString() || 'TBD'}`,
            `Drop-off: ${endDate?.toLocaleString() || 'TBD'}`,
            `Duration: ${days || 1} day(s)`,
            `Pickup Location: ${locations.pickup || 'TBD'}`,
            `Drop-off Location: ${locations.dropoff || 'TBD'}`,
            `Destination: ${locations.destination || 'TBD'}`,
            `Total: PHP ${Number(booking.total_amount || 0).toLocaleString()}`,
            `Deposit: PHP ${Number(booking.deposit_amount || 0).toLocaleString()}`,
            `Remaining Balance: PHP ${Number(booking.remaining_amount || 0).toLocaleString()}`,
            '',
            'We will contact you once the booking has been reviewed.',
            '',
            'Katada Van Rentals',
          ].join('\n'),
        },
      })
    } catch {
      // ponytail: booking success matters more than mail delivery here
    }

    useBookingStore.getState().reset()
    navigate('/bookings')
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 sm:py-8">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back
        </button>

        {error && (
          <div className="mb-4 rounded-2xl border border-[#e92935]/30 bg-[#e92935]/8 px-4 py-3 text-sm font-bold text-[#b91c1c]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr]">
            <div className="space-y-6">
              <BookingSection title="Rental Details" icon={Info}>
                <RentalDetailsFields />
              </BookingSection>
              <BookingSection title="Customer Info" icon={ShieldCheck}>
                <CustomerInfoFields />
              </BookingSection>
              <BookingSection title="Complete Address" icon={MapPinIcon}>
                <AddressFields />
              </BookingSection>
              <BookingSection title="Locations" icon={MapPinIcon}>
                <LocationsFields />
              </BookingSection>
              {rentalType === 'self-drive' && (
                <BookingSection title="Payment" icon={CreditCard}>
                  <PaymentFields />
                </BookingSection>
              )}
              {selfDriveBlocked && (
                <div className="rounded-2xl border border-[#e92935]/20 bg-[#e92935]/8 px-4 py-3 text-sm font-semibold text-[#87131c]">
                  Self Drive is locked until your driver's license, valid ID, and proof of billing are uploaded.
                  <Link to="/documents" className="ml-1 font-bold underline">Upload documents</Link>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Additional Notes (optional)</label>
                <textarea value={notes} onChange={(e) => useBookingStore.getState().setNotes(e.target.value)} rows={3}
                  placeholder="Any special requests, notes for the admin, accessibility needs, etc."
                  className="block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>
            <div className="lg:sticky lg:top-6 lg:self-start">
              <PriceSummary
                vehicleName={vehicle!.name}
                basePricePerDay={vehicle!.base_price_per_day}
                driverRatePerDay={vehicle!.driver_rate_per_day}
                submitting={submitting}
                disabled={selfDriveBlocked || documentsQuery.isLoading}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
