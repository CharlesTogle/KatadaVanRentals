import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { useVehicleById } from '@/hooks/use-vehicles'
import { useProfile } from '@/hooks/use-profile'
import { useCustomerDocuments } from '@/hooks/use-documents'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { BookingSection } from '@/components/booking/booking-section'
import { RentalDetailsFields } from '@/components/booking/rental-details-fields'
import { CustomerInfoFields } from '@/components/booking/customer-info-fields'
import { AddressFields } from '@/components/booking/address-fields'
import { LocationsFields } from '@/components/booking/locations-fields'
import { PaymentFields } from '@/components/booking/payment-fields'
import { PriceSummary } from '@/components/booking/price-summary'
import { BookingFormSkeleton } from '@/components/booking/booking-form-skeleton'
import { showError } from '@/lib/errors'
import { getBookingPriceBreakdown, getMissingSelfDriveDocuments, hasRequiredSelfDriveDocuments } from '@/lib/booking-utils'
import { supabase } from '@/lib/supabase'
import { useBookingStore } from '@/store/booking-store'

function generateBookingNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = crypto.randomUUID().slice(0, 4).toUpperCase()
  return `CR-${y}${m}${d}-${rand}`
}

function formatRentalLabel(rentalType: 'self-drive' | 'with-driver') {
  return rentalType === 'self-drive' ? 'Self Drive' : 'With Driver'
}

function formatDocumentLabel(type: string) {
  switch (type) {
    case 'driver_license':
      return "Driver's License"
    case 'valid_id':
      return 'Valid ID'
    case 'proof_of_billing':
      return 'Proof of Billing'
    default:
      return type
  }
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
  const setNotes = useBookingStore((s) => s.setNotes)

  const vehicleQuery = useVehicleById(vehicleId)
  const profileQuery = useProfile(user?.id)
  const documentsQuery = useCustomerDocuments(user?.id)
  const paymentMethodsQuery = usePaymentMethods()

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
  }, [profileQuery.data, profileQuery.isLoading, setAddress, setProfile, user])

  const vehicle = vehicleQuery.data ?? null
  const loading = vehicleQuery.isLoading || (!!user && profileQuery.isLoading)
  const selfDriveDocumentsReady = hasRequiredSelfDriveDocuments(documentsQuery.data || [])
  const missingSelfDriveDocuments = getMissingSelfDriveDocuments(documentsQuery.data || [])
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

  const bookingVehicle = vehicle!
  const startDate = startParam ? new Date(startParam) : null
  const endDate = endParam ? new Date(endParam) : null
  const pricing = getBookingPriceBreakdown({
    rentalType,
    startAt: startParam,
    endAt: endParam,
    basePricePerDay: bookingVehicle.base_price_per_day,
    driverRatePerDay: bookingVehicle.driver_rate_per_day,
  })
  const selectedPaymentMethod = paymentMethodsQuery.data?.find((method) => method.id === payment.method)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (selfDriveBlocked) {
      setError('Self Drive requires your driver\'s license, valid ID, and proof of billing before submission.')
      return
    }

    if (!payment.method) {
      setError('Please select a payment method.')
      return
    }

    if (!receiptFile) {
      setError('Please upload your receipt or proof of payment.')
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
        p_vehicle_id: bookingVehicle.id,
        p_rental_model: rentalModel,
        p_start_at: startDate?.toISOString() || new Date().toISOString(),
        p_end_at: endDate?.toISOString() || null,
        p_duration_days: pricing.days || 1,
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
      channel: selectedPaymentMethod?.channel || 'bank_transfer',
      status: 'submitted',
      amount: booking.deposit_amount,
      reference_number: payment.reference || null,
      receipt_path: receiptPath,
      submitted_by: user.id,
    })

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
            `Vehicle: ${bookingVehicle.name}`,
            `Rental Type: ${formatRentalLabel(rentalType)}`,
            `Pickup: ${startDate?.toLocaleString() || 'TBD'}`,
            `Drop-off: ${endDate?.toLocaleString() || 'TBD'}`,
            `Duration: ${pricing.days || 1} day(s)`,
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
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back to vehicle
        </button>

        <h1 className="text-3xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Book {bookingVehicle.name}</h1>
        <p className="mt-2 text-base font-medium text-[#071f52]/58 sm:text-lg">
          Fill in all details below. Your booking will be reviewed by our team.
        </p>

        {error ? (
          <div className="mb-4 mt-6 rounded-2xl border border-[#e92935]/30 bg-[#e92935]/8 px-4 py-3 text-sm font-bold text-[#b91c1c]">
            {error}
          </div>
        ) : null}

        {selfDriveBlocked ? (
          <div className="mt-8 rounded-[24px] border border-[#e92935]/24 bg-[#fff5f5] px-5 py-5 text-[#b91c1c] sm:px-6">
            <p className="text-lg font-black">Profile documents required for Self-Drive</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#b91c1c]/88">
              You cannot submit a self-drive booking until the following documents are uploaded to your profile. Please complete them first, then return here to book.
            </p>
            <ul className="mt-4 space-y-2 text-sm font-semibold">
              {missingSelfDriveDocuments.map((documentType) => (
                <li key={documentType}>× {formatDocumentLabel(documentType)} - missing</li>
              ))}
            </ul>
            <Link to="/documents" className="mt-5 inline-flex text-base font-black underline underline-offset-4">
              Complete your documents →
            </Link>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div className="card flex items-center gap-4 rounded-[24px] p-4 sm:p-5">
                <img
                  src={bookingVehicle.image_paths?.[0] || '/van-1.jpg'}
                  alt={bookingVehicle.name}
                  className="h-16 w-20 rounded-2xl object-cover"
                />
                <div>
                  <p className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">{bookingVehicle.name}</p>
                  <p className="mt-1 text-base font-medium text-[#071f52]/52">
                    Toyota · {bookingVehicle.transmission || 'Manual'} · {bookingVehicle.passenger_count} seats
                  </p>
                </div>
              </div>

              <BookingSection title="1. RENTAL DETAILS">
                <RentalDetailsFields />
              </BookingSection>

              <BookingSection title="2. CUSTOMER INFORMATION">
                <CustomerInfoFields />
              </BookingSection>

              <BookingSection title="3. COMPLETE ADDRESS">
                <AddressFields />
              </BookingSection>

              <BookingSection title="4. LOCATIONS">
                <LocationsFields />
              </BookingSection>

              <BookingSection title="5. PAYMENT">
                <PaymentFields depositAmount={pricing.deposit} />
              </BookingSection>

              <div className="card">
                <h2 className="mb-4 text-base font-black tracking-[-0.02em] text-[#071f52]">ADDITIONAL NOTES (OPTIONAL)</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special requests, notes for the admin, accessibility needs, etc."
                  className="block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>

              <div className="pb-8 pt-2 text-center text-sm font-medium text-[#071f52]/48">
                <p>© 2026 Katada Transportation Services. All rights reserved.</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  <Link to="/terms" className="font-bold text-[#071f52] hover:text-[#e92935]">Terms of Service</Link>
                  <Link to="/privacy" className="font-bold text-[#071f52] hover:text-[#e92935]">Privacy Policy</Link>
                </div>
                <p className="mt-2">Car Rental Booking System Powered by CarRentSaaS</p>
              </div>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <PriceSummary
                rentalType={rentalType}
                days={pricing.days}
                basePricePerDay={bookingVehicle.base_price_per_day}
                driverRatePerDay={bookingVehicle.driver_rate_per_day}
                baseTotal={pricing.baseTotal}
                driverTotal={pricing.driverTotal}
                grandTotal={pricing.grandTotal}
                deposit={pricing.deposit}
                remaining={pricing.remaining}
                submitting={submitting}
                disabled={selfDriveBlocked || documentsQuery.isLoading || paymentMethodsQuery.isLoading}
                disabledMessage={selfDriveBlocked ? 'Complete your profile documents to enable booking.' : undefined}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
