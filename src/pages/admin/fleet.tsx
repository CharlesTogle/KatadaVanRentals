import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Pencil, Search, Trash2 } from 'lucide-react'
import {
  useAdminVehicles,
  useBrands,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicleTypes,
} from '@/hooks/use-vehicles'
import { Dialog } from '@/components/ui/dialog'
import { FleetForm, type FleetFormData, toVehicleInput } from '@/components/admin/fleet-form'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Vehicle } from '@/types/vehicle'

const inputClass =
  'block w-full rounded-xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'

export default function Fleet() {
  const navigate = useNavigate()
  const { data: vehicles = [], isLoading } = useAdminVehicles()
  const { data: brands = [] } = useBrands()
  const { data: vehicleTypes = [] } = useVehicleTypes()
  const updateMutation = useUpdateVehicle()
  const deleteMutation = useDeleteVehicle()

  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rentalFilter, setRentalFilter] = useState('')

  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const rentalLabel = (v: Vehicle) => {
    const parts: string[] = []
    if (v.supports_self_drive) parts.push('Self-Drive')
    if (v.supports_all_out) parts.push('All Out')
    if (v.supports_all_in) parts.push('All In')
    return parts.length ? parts.join(', ') : 'None'
  }

  const filtered = useMemo(() => {
    return vehicles.filter((v: Vehicle) => {
      const q = search.toLowerCase()
      if (q && !v.name.toLowerCase().includes(q) && !v.plate_number.toLowerCase().includes(q)) return false
      if (brandFilter && v.brand_id !== brandFilter) return false
      if (typeFilter && v.vehicle_type_id !== typeFilter) return false
      if (statusFilter === 'available' && !v.is_available) return false
      if (statusFilter === 'unavailable' && v.is_available) return false
      if (rentalFilter === 'self_drive' && !v.supports_self_drive) return false
      if (rentalFilter === 'all_out' && !v.supports_all_out) return false
      if (rentalFilter === 'all_in' && !v.supports_all_in) return false
      if (rentalFilter === 'with_driver' && !v.supports_all_in && !v.supports_all_out) return false
      if (rentalFilter === 'pickup' && !v.supports_pickup_dropoff) return false
      return true
    })
  }, [vehicles, search, brandFilter, typeFilter, statusFilter, rentalFilter])

  const handleEdit = async (vehicle: Vehicle, data: FleetFormData) => {
    try {
      await updateMutation.mutateAsync({ id: vehicle.id, data: toVehicleInput(data) })
      toast.success(`${data.name} updated.`)
      setEditing(null)
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toast.success(`${deleting.name} deleted.`)
      setDeleting(null)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete.')
    }
  }

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Our Fleet</h1>
        <button
          className="rounded-xl bg-[#071f52] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#112458] transition-colors"
          onClick={() => navigate('/admin/fleet/new')}
        >
          Add Vehicle
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#071f52]/38" />
          <input
            className={cn(inputClass, 'pl-9')}
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={cn(inputClass, 'w-auto')} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={cn(inputClass, 'w-auto')} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {vehicleTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={cn(inputClass, 'w-auto')} value={rentalFilter} onChange={(e) => setRentalFilter(e.target.value)}>
          <option value="">All Rental Options</option>
          <option value="self_drive">Self-Drive</option>
          <option value="all_out">All Out</option>
          <option value="all_in">All In</option>
          <option value="with_driver">With Driver</option>
          <option value="pickup">Pickup &amp; Drop-off</option>
        </select>
        <select className={cn(inputClass, 'w-auto')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Not Available</option>
        </select>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          {vehicles.length ? 'No vehicles match your filters.' : 'No vehicles listed yet.'}
        </div>
      ) : (
        <div className="mt-6 card-overflow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 w-16">IMAGE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TYPE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">RENTAL</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BASE PRICE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">DRIVER RATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {filtered.map((v: Vehicle) => (
                <tr key={v.id} className="hover:bg-[#f7f9ff] transition-colors">
                  <td className="px-5 py-3">
                    <img
                      src={v.image_paths?.[0] || '/van-1.jpg'}
                      alt={v.name}
                      className="h-12 w-16 rounded-lg object-cover border border-[#071f52]/10"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <span className="text-sm font-bold text-[#071f52]">{v.name}</span>
                      <br />
                      <span className="text-xs font-semibold text-[#071f52]/48">{v.plate_number}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">
                      {vehicleTypes.find((t) => t.id === v.vehicle_type_id)?.name || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold text-[#071f52]/64">{rentalLabel(v)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">₱{Number(v.base_price_per_day).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">₱{Number(v.driver_rate_per_day).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-bold',
                      v.is_available ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-50 text-red-600',
                    )}>
                      {v.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-5 py-3 relative">
                    <button
                      className="rounded-lg p-1.5 text-[#071f52]/38 hover:bg-[#071f52]/6 hover:text-[#071f52] transition-colors"
                      onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === v.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-10 z-20 w-36 rounded-xl border border-[#071f52]/10 bg-white py-1 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-[#071f52] hover:bg-[#f7f9ff]"
                            onClick={() => { setEditing(v); setOpenMenuId(null) }}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => { setDeleting(v); setOpenMenuId(null) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit Vehicle">
        {editing && (
          <FleetForm
            vehicle={editing}
            onSubmit={(data) => handleEdit(editing, data)}
            onCancel={() => setEditing(null)}
            isProcessing={updateMutation.isPending}
          />
        )}
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete Vehicle">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-[#071f52]/64">
              Are you sure you want to delete <span className="font-bold text-[#071f52]">{deleting.name}</span> ({deleting.plate_number})? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#071f52]/14 px-4 py-2 text-sm font-semibold text-[#071f52] hover:bg-[#f7f9ff] transition-colors"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
