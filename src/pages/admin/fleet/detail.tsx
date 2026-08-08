import { useState } from 'react'
import { ArrowLeft, Check, Pencil, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FleetForm, type FleetFormData, toVehicleInput } from '@/components/admin/fleet-form'
import { Dialog } from '@/components/ui/dialog'
import { useDeleteVehicle, useUpdateVehicle, useVehicleById } from '@/hooks/use-vehicles'
import { cn } from '@/lib/utils'

const money = (value: number | null | undefined) => `₱${Number(value ?? 0).toLocaleString()}`

export default function FleetDetail() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const navigate = useNavigate()
  const { data: vehicle, isLoading } = useVehicleById(vehicleId)
  const updateMutation = useUpdateVehicle()
  const deleteMutation = useDeleteVehicle()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleEdit = async (data: FleetFormData) => {
    if (!vehicle) return
    try {
      await updateMutation.mutateAsync({ id: vehicle.id, data: toVehicleInput(data) })
      toast.success(`${data.name} updated.`)
      setEditing(false)
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong.')
    }
  }

  const handleDelete = async () => {
    if (!vehicle) return
    try {
      await deleteMutation.mutateAsync(vehicle.id)
      toast.success(`${vehicle.name} deleted.`)
      navigate('/admin/fleet', { replace: true })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete.')
    }
  }

  if (isLoading) return <div className="py-10 text-sm font-semibold text-[#071f52]/48">Loading vehicle...</div>
  if (!vehicle) {
    return (
      <div className="py-10 text-center">
        <p className="font-bold text-[#071f52]">Vehicle not found.</p>
        <Link to="/admin/fleet" className="mt-3 inline-block text-sm font-bold text-[#e92935]">Back to fleet</Link>
      </div>
    )
  }

  const brand = vehicle.brand || 'Not set'
  const type = vehicle.vehicle_type || 'Not set'
  const images = vehicle.image_paths?.length ? vehicle.image_paths : ['/van-1.jpg']
  const rentalOptions = [
    ['Self-drive', vehicle.supports_self_drive],
    ['All out', vehicle.supports_all_out],
    ['All in', vehicle.supports_all_in],
    ['Pickup & drop-off', vehicle.supports_pickup_dropoff],
  ] as const

  return (
    <div className="mx-auto max-w-[1100px] py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Link to="/admin/fleet" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#071f52]/60 hover:text-[#071f52]">
        <ArrowLeft size={16} /> Back to fleet
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">{vehicle.name}</h1>
            <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', vehicle.is_available ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-50 text-red-600')}>
              {vehicle.is_available ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#071f52]/48">{vehicle.plate_number}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#071f52]/14 bg-white px-4 py-2 text-sm font-bold text-[#071f52] hover:bg-[#f7f9ff]"><Pencil size={15} /> Edit</button>
          <button type="button" onClick={() => setDeleting(true)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"><Trash2 size={15} /> Delete</button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <img src={images[0]} alt={vehicle.name} className="aspect-[16/10] w-full rounded-2xl border border-[#071f52]/10 object-cover" />
          {images.length > 1 && <div className="flex gap-2 overflow-x-auto">{images.slice(1).map((image) => <img key={image} src={image} alt="" className="h-20 w-28 shrink-0 rounded-xl border border-[#071f52]/10 object-cover" />)}</div>}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
            <h2 className="text-sm font-black text-[#071f52]">Vehicle information</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
              {[['Brand', brand], ['Type', type], ['Year', vehicle.year || 'Not set'], ['Transmission', vehicle.transmission || 'Not set'], ['Fuel type', vehicle.fuel_type || 'Not set'], ['Capacity', `${vehicle.passenger_count} passengers, ${vehicle.bag_count} bags`]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-[#071f52]/40">{label}</dt><dd className="mt-1 font-bold text-[#071f52]">{value}</dd></div>)}
            </dl>
          </section>

          <section className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
            <h2 className="text-sm font-black text-[#071f52]">Rates</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[['Base price / day', money(vehicle.base_price_per_day)], ['12-hour rate', vehicle.twelve_hour_rate ? money(vehicle.twelve_hour_rate) : 'Not set'], ['Driver / day', money(vehicle.driver_rate_per_day)], ['Distance / km', `${money(vehicle.peso_per_km)}/km`], ['Delivery fee', money(vehicle.delivery_fee)], ['Security deposit', `${money(vehicle.security_deposit)}${vehicle.security_deposit_type === 'percent' ? '%' : ''}`]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-[#071f52]/40">{label}</dt><dd className="mt-1 font-bold text-[#071f52]">{value}</dd></div>)}
            </dl>
          </section>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#071f52]/10 bg-white p-5">
        <h2 className="text-sm font-black text-[#071f52]">Rental options</h2>
        <div className="mt-4 flex flex-wrap gap-2">{rentalOptions.map(([label, enabled]) => <span key={label} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold', enabled ? 'bg-[#16a34a]/10 text-[#16803a]' : 'bg-[#071f52]/6 text-[#071f52]/40')} >{enabled ? <Check size={13} /> : <X size={13} />}{label}</span>)}</div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-[#071f52]/64">{vehicle.description || 'No description added for this vehicle.'}</p>
      </section>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit Vehicle">
        <FleetForm vehicle={vehicle} onSubmit={handleEdit} onCancel={() => setEditing(false)} isProcessing={updateMutation.isPending} />
      </Dialog>
      <Dialog open={deleting} onClose={() => setDeleting(false)} title="Delete Vehicle">
        <div className="space-y-4"><p className="text-sm text-[#071f52]/64">Are you sure you want to delete <strong className="text-[#071f52]">{vehicle.name}</strong> ({vehicle.plate_number})? This cannot be undone.</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setDeleting(false)} className="rounded-xl border border-[#071f52]/14 px-4 py-2 text-sm font-semibold text-[#071f52]">Cancel</button><button type="button" onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button></div></div>
      </Dialog>
    </div>
  )
}
