import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw, Search, Trash2 } from 'lucide-react'
import {
  useAdminVehicles,
  useDeleteVehicle,
} from '@/hooks/use-vehicles'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Vehicle } from '@/types/vehicle'
import { VEHICLE_TYPES } from '@/constants/vehicle'
import { showError } from '@/lib/errors'

const inputClass =
  'block w-full rounded-xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
const PAGE_SIZE = 20

export default function Fleet() {
  const navigate = useNavigate()
  const { data: vehicles = [], isLoading, isFetching, isError, refetch } = useAdminVehicles()
  const deleteMutation = useDeleteVehicle()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rentalFilter, setRentalFilter] = useState('')
  const [page, setPage] = useState(1)

  const [deleting, setDeleting] = useState<Vehicle | null>(null)

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
      if (typeFilter && v.vehicle_type !== typeFilter) return false
      if (statusFilter === 'available' && !v.is_available) return false
      if (statusFilter === 'unavailable' && v.is_available) return false
      if (rentalFilter === 'self_drive' && !v.supports_self_drive) return false
      if (rentalFilter === 'all_out' && !v.supports_all_out) return false
      if (rentalFilter === 'all_in' && !v.supports_all_in) return false
      if (rentalFilter === 'with_driver' && !v.supports_all_in && !v.supports_all_out) return false
      if (rentalFilter === 'pickup' && !v.supports_pickup_dropoff) return false
      return true
    })
  }, [vehicles, search, typeFilter, statusFilter, rentalFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageVehicles = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toast.success(`${deleting.name} deleted.`)
      setDeleting(null)
    } catch (err: any) {
      toast.error(showError(err))
    }
  }

  return (
    <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Our Fleet</h1>
        <button
          className="rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white hover:bg-[#112458] transition-colors"
          onClick={() => navigate('/admin/fleet/new')}
        >
          + Add
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full min-w-[160px] flex-1 sm:flex-none sm:w-auto sm:max-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#071f52]/38" />
          <input
            className={cn(inputClass, 'pl-9 w-full')}
            placeholder="Search vehicles..."
            value={search}
             onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
          <select className={cn(inputClass, 'w-[calc(50%-0.375rem)] sm:w-auto')} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
           <option value="">All Types</option>
           {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
         <select className={cn(inputClass, 'w-[calc(50%-0.375rem)] sm:w-auto')} value={rentalFilter} onChange={(e) => { setRentalFilter(e.target.value); setPage(1) }}>
          <option value="">All Rental Options</option>
          <option value="self_drive">Self-Drive</option>
          <option value="all_out">All Out</option>
          <option value="all_in">All In</option>
          <option value="with_driver">With Driver</option>
          <option value="pickup">Pickup &amp; Drop-off</option>
        </select>
        <select className={cn(inputClass, 'w-[calc(50%-0.375rem)] sm:w-auto')} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Not Available</option>
        </select>
      </div>

      {(isLoading || (!isError && filtered.length > 0)) ? (
        <div className="mt-6 card-overflow">
          <div className="flex items-center justify-between border-b border-[#071f52]/10 bg-white px-5 py-3">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-[#071f52]/48">Show 20 per page</p>
              <button
                type="button"
                aria-label="Refresh fleet"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : undefined} />
              </button>
            </div>
            <FleetPagination page={currentPage} totalPages={totalPages} setPage={setPage} disabled={isFetching} />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-3 space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="mt-8 rounded-2xl border border-[#e92935]/20 bg-[#e92935]/5 p-8 text-center text-sm font-semibold text-[#b91c1c]">
          <p>Could not load vehicles. Please try again.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-xl bg-[#071f52] px-4 py-2 text-xs font-bold text-white">Try again</button>
        </div>
      ) : !filtered.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          {vehicles.length ? 'No vehicles match your filters.' : 'No vehicles listed yet.'}
        </div>
      ) : (
        <div className="-mt-1 card-overflow overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 w-16">IMAGE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TYPE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">RENTAL</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BASE PRICE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">DISTANCE RATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">DRIVER RATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {pageVehicles.map((v: Vehicle) => {
                return (
                <tr
                  key={v.id}
                  className="cursor-pointer hover:bg-[#f7f9ff] transition-colors"
                  onClick={() => navigate(`/admin/fleet/${v.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/admin/fleet/${v.id}`)
                    }
                  }}
                  tabIndex={0}
                  aria-label={`View details for ${v.name}`}
                >
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
                       {v.vehicle_type || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold text-[#071f52]/64">{rentalLabel(v)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">₱{Number(v.base_price_per_day).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">₱{Number(v.peso_per_km ?? 0).toLocaleString()}/km</span>
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
                  <td
                    className="relative px-5 py-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Delete ${v.name}`}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => setDeleting(v)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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

function FleetPagination({
  page,
  totalPages,
  setPage,
  disabled = false,
}: {
  page: number
  totalPages: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  disabled?: boolean
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-end gap-3">
      <p className="text-xs font-semibold text-[#071f52]/48">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={disabled || page === 1}
          className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={disabled || page === totalPages}
          className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
