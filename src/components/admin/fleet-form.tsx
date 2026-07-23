import { type FormEvent, useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBrands, useVehicleTypes } from '@/hooks/use-vehicles'
import { uploadVehicleImage } from '@/services/vehicle-service'
import { loadDraft, saveDraft, clearDraft } from '@/lib/draft-storage'
import type { CreateVehicleInput, Vehicle } from '@/types/vehicle'

const inputClass =
  'block w-full rounded-xl border border-[#071f52]/14 bg-white px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:ring-2 focus:ring-[#ffd923]/60 outline-none'
const labelClass = 'text-xs font-bold text-[#071f52]'
const hintClass = 'mt-1 text-[11px] text-[#071f52]/48'

export interface FleetFormData {
  name: string
  plate_number: string
  year: string
  brand_id: string
  vehicle_type_id: string
  description: string
  passenger_count: string
  bag_count: string
  transmission: string
  fuel_type: string
  base_price_per_day: string
  excess_rate_per_hour: string
  auto_full_day_after_hours: string
  twelve_hour_rate: string
  driver_rate_per_day: string
  car_wash_fee: string
  delivery_fee: string
  security_deposit: string
  discount: string
  km_per_liter: string
  supports_all_in: boolean
  supports_all_out: boolean
  supports_self_drive: boolean
  supports_pickup_dropoff: boolean
  is_available: boolean
  image_paths: string[]
}

export function toVehicleInput(data: FleetFormData): CreateVehicleInput {
  const optionalNumber = (value: string) => (value.trim() ? Number(value) : null)

  return {
    name: data.name.trim(),
    plate_number: data.plate_number.trim(),
    year: optionalNumber(data.year),
    brand_id: data.brand_id || null,
    vehicle_type_id: data.vehicle_type_id || null,
    description: data.description.trim() || null,
    passenger_count: Number(data.passenger_count),
    bag_count: Number(data.bag_count || '0'),
    transmission: data.transmission || null,
    fuel_type: data.fuel_type || null,
    base_price_per_day: Number(data.base_price_per_day),
    excess_rate_per_hour: Number(data.excess_rate_per_hour || '0'),
    auto_full_day_after_hours: Number(data.auto_full_day_after_hours || '12'),
    twelve_hour_rate: optionalNumber(data.twelve_hour_rate),
    driver_rate_per_day: Number(data.driver_rate_per_day),
    car_wash_fee: Number(data.car_wash_fee || '0'),
    delivery_fee: Number(data.delivery_fee || '0'),
    security_deposit: Number(data.security_deposit || '0'),
    discount: Number(data.discount || '0'),
    km_per_liter: optionalNumber(data.km_per_liter),
    supports_all_in: data.supports_all_in,
    supports_all_out: data.supports_all_out,
    supports_self_drive: data.supports_self_drive,
    supports_pickup_dropoff: data.supports_pickup_dropoff,
    is_available: data.is_available,
    image_paths: data.image_paths,
  }
}

const DEFAULT_FORM: FleetFormData = {
  name: '',
  plate_number: '',
  year: '',
  brand_id: '',
  vehicle_type_id: '',
  description: '',
  passenger_count: '',
  bag_count: '0',
  transmission: '',
  fuel_type: '',
  base_price_per_day: '',
  excess_rate_per_hour: '0',
  auto_full_day_after_hours: '12',
  twelve_hour_rate: '',
  driver_rate_per_day: '',
  car_wash_fee: '0',
  delivery_fee: '0',
  security_deposit: '0',
  discount: '0',
  km_per_liter: '',
  supports_all_in: true,
  supports_all_out: true,
  supports_self_drive: true,
  supports_pickup_dropoff: true,
  is_available: true,
  image_paths: [],
}

interface FleetFormProps {
  vehicle?: Vehicle | null
  onSubmit: (data: FleetFormData) => Promise<void>
  onCancel: () => void
  isProcessing: boolean
  draftKey?: string
}

export function FleetForm({ vehicle, onSubmit, onCancel, isProcessing, draftKey }: FleetFormProps) {
  const { data: brands = [] } = useBrands()
  const { data: vehicleTypes = [] } = useVehicleTypes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formError, setFormError] = useState('')

  const buildInitial = (): FleetFormData => {
    if (vehicle) {
      return {
        name: vehicle.name,
        plate_number: vehicle.plate_number,
        year: vehicle.year ? String(vehicle.year) : '',
        brand_id: vehicle.brand_id || '',
        vehicle_type_id: vehicle.vehicle_type_id || '',
        description: vehicle.description || '',
        passenger_count: String(vehicle.passenger_count),
        bag_count: String(vehicle.bag_count),
        transmission: vehicle.transmission || '',
        fuel_type: vehicle.fuel_type || '',
        base_price_per_day: String(vehicle.base_price_per_day),
        excess_rate_per_hour: String(vehicle.excess_rate_per_hour),
        auto_full_day_after_hours: String(vehicle.auto_full_day_after_hours),
        twelve_hour_rate: vehicle.twelve_hour_rate ? String(vehicle.twelve_hour_rate) : '',
        driver_rate_per_day: String(vehicle.driver_rate_per_day),
        car_wash_fee: String(vehicle.car_wash_fee),
        delivery_fee: String(vehicle.delivery_fee),
        security_deposit: String(vehicle.security_deposit),
        discount: String(vehicle.discount),
        km_per_liter: vehicle.km_per_liter ? String(vehicle.km_per_liter) : '',
        supports_all_in: vehicle.supports_all_in,
        supports_all_out: vehicle.supports_all_out,
        supports_self_drive: vehicle.supports_self_drive,
        supports_pickup_dropoff: vehicle.supports_pickup_dropoff,
        is_available: vehicle.is_available,
        image_paths: vehicle.image_paths,
      }
    }
    if (draftKey) {
      const draft = loadDraft<FleetFormData>(draftKey)
      if (draft) return { ...DEFAULT_FORM, ...draft, image_paths: [] }
    }
    return DEFAULT_FORM
  }

  const initial = buildInitial()
  const [images, setImages] = useState<string[]>(vehicle?.image_paths || [])
  const [form, setForm] = useState<FleetFormData>(initial)

  const set = useCallback(
    (key: keyof FleetFormData, value: string | boolean) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value }
        if (draftKey && !vehicle) saveDraft(draftKey, next)
        return next
      })
    },
    [draftKey, vehicle],
  )

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploadingImage(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        urls.push(await uploadVehicleImage(file))
      }
      const newImages = [...images, ...urls]
      setImages(newImages)
      setForm((prev) => ({ ...prev, image_paths: newImages }))
    } catch {
      setFormError('Failed to upload image. Try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    setForm((prev) => ({ ...prev, image_paths: newImages }))
  }

  const num = (s: string) => (s.trim() ? Number(s) : 0)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Vehicle Name is required.'); return }
    if (!form.plate_number.trim()) { setFormError('Plate Number is required.'); return }
    if (!form.base_price_per_day.trim() || isNaN(Number(form.base_price_per_day)) || Number(form.base_price_per_day) < 0) {
      setFormError('Valid Base Price is required.'); return
    }
    if (!form.passenger_count.trim() || isNaN(Number(form.passenger_count)) || Number(form.passenger_count) < 0) {
      setFormError('Valid Seating Capacity is required.'); return
    }
    if (!form.driver_rate_per_day.trim() || isNaN(Number(form.driver_rate_per_day)) || Number(form.driver_rate_per_day) < 0) {
      setFormError('Valid Driver Rate is required.'); return
    }
    if (form.year.trim() && (isNaN(Number(form.year)) || Number(form.year) < 1900 || Number(form.year) > 2100)) {
      setFormError('Invalid Year.'); return
    }
    await onSubmit(form)
    if (draftKey) clearDraft(draftKey)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {formError}
        </div>
      )}

      {/* Basic Information */}
      <section className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-black tracking-[-0.02em] text-[#071f52]">Basic Information</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Vehicle Name <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Commuter Deluxe"
            />
          </div>
          <div>
            <label className={labelClass}>Plate Number <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              value={form.plate_number}
              onChange={(e) => set('plate_number', e.target.value.toUpperCase())}
              placeholder="e.g. NBS4512"
            />
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input
              className={inputClass}
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              placeholder="e.g. 2024"
            />
          </div>
          <div>
            <label className={labelClass}>Brand</label>
            <select className={inputClass} value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}>
              <option value="">Select brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Vehicle Type</label>
            <select className={inputClass} value={form.vehicle_type_id} onChange={(e) => set('vehicle_type_id', e.target.value)}>
              <option value="">Select type</option>
              {vehicleTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Rental Option</label>
            <div className="mt-1.5 flex flex-wrap gap-6">
              {[
                { key: 'supports_all_in' as const, label: 'All In (Full Service)' },
                { key: 'supports_all_out' as const, label: 'All Out (Van + Driver)' },
                { key: 'supports_self_drive' as const, label: 'Self Drive' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 rounded border-[#071f52]/20 text-[#071f52] accent-[#071f52]"
                  />
                  <span className="text-sm font-semibold text-[#071f52]">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Transmission</label>
            <select className={inputClass} value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
              <option value="">Select</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Fuel Type</label>
            <select className={inputClass} value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}>
              <option value="">Select</option>
              <option value="Diesel">Diesel</option>
              <option value="Gasoline">Gasoline</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Seating Capacity <span className="text-red-500">*</span></label>
            <input className={inputClass} type="number" min="0" value={form.passenger_count} onChange={(e) => set('passenger_count', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Luggage Capacity</label>
            <input className={inputClass} type="number" min="0" value={form.bag_count} onChange={(e) => set('bag_count', e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief vehicle description" />
        </div>

      </fieldset>
      </section>

      {/* Vehicle Rate */}
      <section className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-black tracking-[-0.02em] text-[#071f52]">Vehicle Rate</legend>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Base Price / Day <span className="text-red-500">*</span> ₱</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.base_price_per_day} onChange={(e) => set('base_price_per_day', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Excess Rate / Hour ₱</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.excess_rate_per_hour} onChange={(e) => set('excess_rate_per_hour', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Auto Full-Day After hrs</label>
            <input className={inputClass} type="number" min="1" value={form.auto_full_day_after_hours} onChange={(e) => set('auto_full_day_after_hours', e.target.value)} />
          </div>
        </div>
        <p className={hintClass}>
          Excess billed at ₱{num(form.excess_rate_per_hour).toFixed(2)}/hr. After {form.auto_full_day_after_hours || '–'} hrs excess → full day rate (₱{num(form.base_price_per_day).toFixed(2)}/day) applies.
        </p>
        <div className="mt-4">
          <label className={labelClass}>12-Hour Rate (optional) ₱</label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.twelve_hour_rate}
            onChange={(e) => set('twelve_hour_rate', e.target.value)}
            placeholder="Leave blank to charge the full daily rate on every booking, however short."
          />
          <p className={hintClass}>Leave blank to charge the full daily rate on every booking, however short.</p>
        </div>

      </fieldset>
      </section>

      {/* Additional Fees */}
      <section className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-black tracking-[-0.02em] text-[#071f52]">Additional Fees</legend>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Car Wash Fee ₱</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.car_wash_fee} onChange={(e) => set('car_wash_fee', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Delivery Fee (self-drive only) ₱</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Security Deposit</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.security_deposit} onChange={(e) => set('security_deposit', e.target.value)} />
          </div>
        </div>

      </fieldset>
      </section>

      {/* Discount */}
      <section className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-black tracking-[-0.02em] text-[#071f52]">Discount</legend>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Discount (₱)</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
          </div>
        </div>

      </fieldset>
      </section>

      {/* Other Settings */}
      <section className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-black tracking-[-0.02em] text-[#071f52]">Other Settings</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Driver Rate / Day <span className="text-red-500">*</span> ₱</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.driver_rate_per_day} onChange={(e) => set('driver_rate_per_day', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Fuel Economy (km/L)</label>
            <input className={inputClass} type="number" min="0" step="0.1" value={form.km_per_liter} onChange={(e) => set('km_per_liter', e.target.value)} placeholder="e.g. 8.0" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.supports_pickup_dropoff} onChange={(e) => set('supports_pickup_dropoff', e.target.checked)} className="h-4 w-4 rounded accent-[#071f52]" />
            <span className="text-sm font-semibold text-[#071f52]">Supports Pickup &amp; Drop-off</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_available} onChange={(e) => set('is_available', e.target.checked)} className="h-4 w-4 rounded accent-[#071f52]" />
            <span className="text-sm font-semibold text-[#071f52]">Available for Booking</span>
          </label>
        </div>

      </fieldset>
      </section>

      {/* Vehicle Images */}
      <section className="rounded-2xl border border-[#071f52]/10 bg-white p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-black tracking-[-0.02em] text-[#071f52]">Vehicle Image</legend>
        <p className="mb-4 text-xs text-[#071f52]/48">Upload one cover photo. It&rsquo;s auto-resized in your browser before upload.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="h-20 w-28 rounded-xl object-cover border border-[#071f52]/10" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="flex h-20 w-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#071f52]/14 bg-white text-[#071f52]/38 hover:border-[#071f52]/30 hover:text-[#071f52]/60 transition-colors">
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} disabled={uploadingImage} />
            <Upload className="h-5 w-5" />
          </label>
        </div>
        {uploadingImage && <p className="mt-2 text-xs text-[#071f52]/48">Uploading...</p>}

      </fieldset>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-[#071f52]/10 pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>Cancel</Button>
        <Button type="submit" disabled={isProcessing || uploadingImage}>
          {isProcessing ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  )
}
