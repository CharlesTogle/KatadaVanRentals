import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info, ShieldCheck, CreditCard, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const purposes = [
  'Leisure/Vacation', 'Business/Work', 'Family Event', 'Funeral/Bereavement',
  'Medical/Health', 'School/Educational', 'Moving/Relocation', 'Airport Transfer', 'Other',
]

type Vehicle = {
  id: string
  name: string
  slug: string
  base_price_per_day: number
  driver_rate_per_day: number
  supports_self_drive: boolean
  supports_all_out: boolean
}

type PaymentMethod = {
  id: string
  channel: string
  provider: string
  branch: string | null
  account_number: string | null
  account_name: string | null
}

function generateBookingNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CR-${y}${m}${d}-${rand}`
}

export default function BookingForm() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''

  const [mode, setMode] = useState<'dropoff' | 'keep'>('dropoff')
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', mobile: '+63 ' })
  const [address, setAddress] = useState({ address: '', city: '', province: '', zip: '', country: 'Philippines' })
  const [locations, setLocations] = useState({ pickup: '', dropoff: '', destination: '' })
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState({ method: '', amount: '', reference: '' })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!vehicleId) return
    Promise.all([
      supabase.from('vehicles').select('*').eq('id', vehicleId).single(),
      supabase.from('payment_methods').select('*').eq('is_active', true),
      user ? supabase.from('profiles').select('*').eq('id', user.id).single() : null,
    ]).then(([vRes, pmRes, pRes]) => {
      if (vRes.error) setError('Vehicle not found')
      else setVehicle(vRes.data as Vehicle)

      if (!pmRes.error && pmRes.data) setPaymentMethods(pmRes.data as PaymentMethod[])

      if (pRes && !pRes.error && pRes.data) {
        const p = pRes.data as any
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
      } else if (user) {
        setProfile({
          first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          mobile: '+63 ',
        })
      }

      setLoading(false)
    })
  }, [vehicleId, user])

  useEffect(() => {
    if (paymentMethods.length && !payment.method) {
      setPayment(prev => ({ ...prev, method: paymentMethods[0].id }))
    }
  }, [paymentMethods])

  if (!vehicleId || (!loading && !vehicle)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg font-bold text-[#071f52]">Vehicle not found</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
        <div className="mb-6 h-4 w-16 rounded-lg bg-[#071f52]/10" />
        <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr]">
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-[#071f52]/6" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-[#071f52]/6" />
        </div>
      </div>
    )
  }

  const startDate = startParam ? new Date(startParam) : null
  const endDate = endParam ? new Date(endParam) : null
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const baseTotal = days * vehicle!.base_price_per_day
  const driverTotal = rentalType === 'with-driver' ? days * vehicle!.driver_rate_per_day : 0
  const grandTotal = baseTotal + driverTotal
  const deposit = rentalType === 'self-drive' ? Math.round(baseTotal * 0.1) : 0
  const remaining = grandTotal - deposit

  const priceLineItems = [
    { label: 'Base', detail: `${days}d × ₱${vehicle!.base_price_per_day.toLocaleString()}`, amount: baseTotal },
    ...(rentalType === 'with-driver' ? [{ label: 'Driver', detail: `${days}d × ₱${vehicle!.driver_rate_per_day.toLocaleString()}`, amount: driverTotal }] : []),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !vehicle) return
    setSubmitting(true)
    setError('')

    const rentalModel = rentalType === 'self-drive' ? 'self_drive' : 'all_out'

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_number: generateBookingNumber(),
        customer_id: user.id,
        vehicle_id: vehicle.id,
        rental_model: rentalModel,
        status: 'for_review',
        start_at: startDate?.toISOString() || new Date().toISOString(),
        end_at: endDate?.toISOString() || null,
        duration_days: days || 1,
        pickup_location: locations.pickup || null,
        dropoff_location: locations.dropoff || null,
        destination: locations.destination || null,
        purpose_of_travel: purpose || null,
        notes: notes || null,
        subtotal_amount: grandTotal,
        total_amount: grandTotal,
        deposit_amount: deposit,
        remaining_amount: remaining,
        price_line_items: priceLineItems,
        created_by: user.id,
      })
      .select('id')
      .single()

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
        payment_method_id: payment.method || paymentMethods[0]?.id,
        channel: 'bank_transfer',
        status: 'submitted',
        amount: parseFloat(payment.amount) || deposit,
        reference_number: payment.reference,
        receipt_path: receiptPath,
        submitted_by: user.id,
      })
    }

    navigate('/dashboard?tab=my-bookings')
  }

  const selectedMethod = paymentMethods.find(pm => pm.id === payment.method)
  const methodLabel = selectedMethod
    ? `${selectedMethod.provider}${selectedMethod.account_number ? ` (${selectedMethod.account_number})` : ''} · ${selectedMethod.channel === 'bank_transfer' ? 'Bank Transfer' : 'E-Wallet'}`
    : ''

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
              <Section title="Rental Details" icon={Info}>
                <div className="flex gap-2 rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] p-1">
                  {(['self-drive', 'with-driver'] as const).map((type) => (
                    <button
                      key={type} type="button"
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
                        rentalType === type
                          ? 'bg-[#071f52] text-white shadow-sm'
                          : 'text-[#071f52]/58',
                      )}
                    >
                      {type === 'self-drive' ? 'Self-Drive' : 'With Driver'}
                    </button>
                  ))}
                </div>

                {rentalType === 'with-driver' && (
                  <div className="flex gap-2 rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] p-1">
                    {(['dropoff', 'keep'] as const).map((m) => (
                      <button
                        key={m} type="button"
                        onClick={() => setMode(m)}
                        className={cn(
                          'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
                          mode === m ? 'bg-white text-[#071f52] shadow-sm' : 'text-[#071f52]/58',
                        )}
                      >
                        {m === 'dropoff' ? 'Just a drop-off' : 'Keep the car'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">Start Date & Time</label>
                    <input type="datetime-local" value={startParam} readOnly
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]"
                    />
                  </div>
                  {endParam && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#071f52]">End Date & Time</label>
                      <input type="datetime-local" value={endParam} readOnly
                        className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]"
                      />
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Customer Info" icon={ShieldCheck}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">First Name</label>
                    <input value={profile.first_name} readOnly
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">Last Name</label>
                    <input value={profile.last_name} readOnly
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/60"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">Email</label>
                    <input value={profile.email} readOnly
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#071f52]/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">Mobile</label>
                    <input value={profile.mobile} onChange={(e) => {
                      const val = e.target.value
                      setProfile({ ...profile, mobile: val.startsWith('+63 ') ? val : '+63 ' })
                    }}
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    />
                  </div>
                </div>
              </Section>

              <Section title="Complete Address" icon={MapPinIcon}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#071f52]">Address</label>
                  <input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    placeholder="House / Street / Barangay"
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">City</label>
                    <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">Province</label>
                    <input value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })}
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">ZIP Code</label>
                    <input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071f52]">Country</label>
                    <select value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    >
                      <option>Philippines</option>
                    </select>
                  </div>
                </div>
              </Section>

              <Section title="Locations" icon={MapPinIcon}>
                <p className="text-xs font-medium leading-5 text-[#071f52]/48 mb-3">
                  {rentalType === 'with-driver'
                    ? "Pickup & drop-off only, with a professional driver — the fare is based on the driving distance. No driver's license needed."
                    : 'Enter your pickup, drop-off, and destination details.'}
                </p>
                <div className="space-y-3">
                  <input value={locations.pickup} onChange={(e) => setLocations({ ...locations, pickup: e.target.value })}
                    placeholder="Pickup location"
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                  <input value={locations.dropoff} onChange={(e) => setLocations({ ...locations, dropoff: e.target.value })}
                    placeholder="Drop-off location"
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                  {rentalType === 'self-drive' && (
                    <>
                      <input value={locations.destination} onChange={(e) => setLocations({ ...locations, destination: e.target.value })}
                        placeholder="Destination (optional)"
                        className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                      />
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#071f52]">Purpose of Travel</label>
                        <select value={purpose} onChange={(e) => setPurpose(e.target.value)}
                          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                        >
                          <option value="">Select purpose…</option>
                          {purposes.map((p) => (<option key={p} value={p}>{p}</option>))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </Section>

              {rentalType === 'self-drive' && (
                <Section title="Payment" icon={CreditCard}>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#071f52]">Payment Method</label>
                      <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                        className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                      >
                        {paymentMethods.map((pm) => (
                          <option key={pm.id} value={pm.id}>{methodLabel}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#071f52]">Amount (pre-filled with deposit)</label>
                      <input value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                        placeholder={`${deposit.toLocaleString()}.00`}
                        className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#071f52]">Reference Number</label>
                      <input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                        placeholder="Transaction / Ref #"
                        className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#071f52]">Receipt (JPG, PNG, WEBP, PDF — max 5 MB)</label>
                      <label className={cn(
                        'flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-semibold transition-colors',
                        receiptFile
                          ? 'border-[#16a34a]/40 bg-[#16a34a]/6 text-[#16a34a]'
                          : 'border-[#071f52]/14 bg-[#f7f9ff] text-[#071f52]/48 hover:border-[#071f52]/30',
                      )}>
                        <Upload size={18} />
                        {receiptFile ? receiptFile.name : 'Drag & drop or click to upload'}
                        <input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                    </div>
                  </div>
                </Section>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#071f52]">Additional Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Any special requests, notes for the admin, accessibility needs, etc."
                  className="block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
                <h3 className="text-base font-black text-[#071f52]">Price Summary</h3>
                <p className="text-xs font-medium text-[#071f52]/48">{vehicle!.name} · {days}d</p>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#071f52]/66">Base ({days}d × ₱{vehicle!.base_price_per_day.toLocaleString()})</span>
                    <span className="font-bold">₱{baseTotal.toLocaleString()}.00</span>
                  </div>
                  {rentalType === 'with-driver' && (
                    <div className="flex justify-between">
                      <span className="text-[#071f52]/66">Driver ({days}d × ₱{vehicle!.driver_rate_per_day.toLocaleString()})</span>
                      <span className="font-bold">₱{driverTotal.toLocaleString()}.00</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#071f52]/10 pt-2 text-base">
                    <span className="font-black">Total</span>
                    <span className="font-black">₱{grandTotal.toLocaleString()}.00</span>
                  </div>
                  {rentalType === 'self-drive' && deposit > 0 && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#071f52]/58">Down payment (10%)</span>
                        <span className="font-bold text-[#e92935]">− ₱{deposit.toLocaleString()}.00</span>
                      </div>
                      <div className="flex justify-between border-t border-[#071f52]/10 pt-2 text-sm">
                        <span className="font-black text-[#071f52]">Remaining Balance</span>
                        <span className="font-black text-[#071f52]">₱{remaining.toLocaleString()}.00</span>
                      </div>
                      <p className="text-[10px] font-medium text-[#071f52]/38">(due at pickup)</p>
                    </>
                  )}
                </div>

                <Button type="submit" disabled={submitting}
                  className="mt-5 w-full bg-[#e92935] text-white shadow-[0_8px_20px_rgba(233,41,53,0.2)] hover:bg-[#c91f2a]"
                  size="lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Booking'}
                </Button>

                <p className="mt-3 text-[10px] font-medium leading-4 text-[#071f52]/38 text-center">
                  Booking will be sent for admin review. You will receive a confirmation once reviewed.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={16} className="text-[#071f52]" />
        <h2 className="text-base font-black tracking-[-0.02em] text-[#071f52]">{title}</h2>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function MapPinIcon({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
}
