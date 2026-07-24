import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateAdminBooking } from '@/hooks/use-admin-booking'
import { useAdminVehicles } from '@/hooks/use-vehicles'
import { CustomerPicker, type CustomerPickerValue } from '@/components/admin/customer-picker'
import { BookingPricePreview } from '@/components/admin/booking-price-preview'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import type { AdminBookingCreateInput } from '@/types/admin-booking'

const inputClass = 'w-full rounded-xl border border-[#071f52]/14 bg-white py-2 px-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
const labelClass = 'text-xs font-bold text-[#071f52]/58 mb-1 block'

export function BookingCreateForm() {
  const navigate = useNavigate()
  const createBooking = useCreateAdminBooking()
  const { data: vehicles = [] } = useAdminVehicles()

  const [customer, setCustomer] = useState<CustomerPickerValue>({
    mode: 'existing',
    existingCustomer: null,
    newCustomer: { firstName: '', lastName: '', email: '', mobile: '', sendInvite: true },
  })
  const [vehicleId, setVehicleId] = useState('')
  const [rentalModel, setRentalModel] = useState<'all_out' | 'self_drive' | 'all_in' | ''>('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [conflictError, setConflictError] = useState('')

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null

  const validate = (): string | null => {
    if (customer.mode === 'existing' && !customer.existingCustomer?.id) {
      return 'Please select a customer.'
    }
    if (customer.mode === 'new') {
      if (!customer.newCustomer.firstName.trim()) return 'First name is required.'
      if (!customer.newCustomer.lastName.trim()) return 'Last name is required.'
      if (!customer.newCustomer.email.trim()) return 'Email is required.'
    }
    if (!vehicleId) return 'Please select a vehicle.'
    if (!rentalModel) return 'Please select a rental model.'
    if (!startAt) return 'Pick-up date & time is required.'
    if (!endAt) return 'Drop-off date & time is required.'
    if (new Date(endAt) <= new Date(startAt)) return 'Drop-off must be after pick-up.'
    if (depositAmount && (Number(depositAmount) < 0)) return 'Deposit cannot be negative.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConflictError('')

    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    const input: AdminBookingCreateInput = {
      customerMode: customer.mode,
      existingCustomerId: customer.existingCustomer?.id ?? null,
      newCustomer: customer.mode === 'new' ? customer.newCustomer : null,
      vehicleId,
      rentalModel: rentalModel as AdminBookingCreateInput['rentalModel'],
      startAt,
      endAt,
      pickupLocation,
      dropoffLocation,
      depositAmount,
    }

    try {
      const result = await createBooking.mutateAsync(input)
      toast.success(`Booking ${result.bookingNumber} confirmed.`)
      navigate('/admin/bookings')
    } catch (err: any) {
      if (err?.status === 409) {
        setConflictError(err.message || 'Vehicle is not available for these dates.')
      } else {
        toast.error(showError(err))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Customer */}
        <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#071f52]">Customer</h2>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </section>

        {/* Vehicle & Rental Details */}
        <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#071f52]">Rental Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Vehicle *</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass}>
                <option value="">Select vehicle...</option>
                {vehicles.filter((v) => v.is_available).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rental model *</label>
              <select value={rentalModel} onChange={(e) => setRentalModel(e.target.value as any)} className={inputClass}>
                <option value="">Select...</option>
                <option value="self_drive">Self-drive</option>
                <option value="all_out">All-out (with driver)</option>
                <option value="all_in">All-in (with driver)</option>
              </select>
            </div>
            <div />
            <div>
              <label className={labelClass}>Pick-up date & time *</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Drop-off date & time *</label>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pick-up location</label>
              <input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>Drop-off location</label>
              <input value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
          </div>
        </section>

        {/* Deposit */}
        <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#071f52]">Deposit (optional)</h2>
          <div className="max-w-xs">
            <label className={labelClass}>Deposit amount (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <p className="mt-2 text-xs text-[#071f52]/38">Leave blank or 0 to skip. Deposit is recorded as paid immediately.</p>
        </section>
      </div>

      {/* Right sidebar — preview & actions */}
      <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <BookingPricePreview
          vehicle={selectedVehicle}
          rentalModel={rentalModel}
          startAt={startAt}
          endAt={endAt}
        />

        {conflictError && (
          <div className="rounded-xl border border-[#e92935]/20 bg-[#e92935]/5 p-4 text-sm font-semibold text-[#e92935]">
            {conflictError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/bookings')} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createBooking.isPending} className="flex-1">
            {createBooking.isPending ? 'Confirming...' : 'Record deposit & Confirm booking'}
          </Button>
        </div>
      </div>
    </form>
  )
}
