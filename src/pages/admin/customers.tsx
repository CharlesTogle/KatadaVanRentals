import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminCustomers } from '@/hooks/use-profile'
import { deactivateCustomer, reactivateCustomer, deleteCustomer } from '@/services/profile-service'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Download, Eye, MoreHorizontal, RefreshCw, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import type { AdminCustomerRow } from '@/types/admin-customer'

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString()}.00`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function locationDisplay(c: AdminCustomerRow) {
  return [c.city, c.province, c.country].filter(Boolean).join(', ') || '—'
}

function escapeCsvField(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function exportCsv(rows: AdminCustomerRow[]) {
  const headers = ['Customer', 'Email', 'Mobile', 'Bookings', 'Total Spend', 'Location', 'Joined', 'Last Login', 'Active']
  const lines = rows.map((r) => [
    escapeCsvField([r.first_name, r.last_name].filter(Boolean).join(' ') || r.email),
    escapeCsvField(r.email),
    escapeCsvField(r.mobile || ''),
    String(r.bookings_count),
    String(r.total_spend),
    escapeCsvField(locationDisplay(r)),
    escapeCsvField(formatDate(r.joined_at)),
    escapeCsvField(formatDate(r.last_login_at)),
    r.is_active ? 'Yes' : 'No',
  ].join(','))

  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const PAGE_SIZE = 20

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767.98px)').matches
}

export default function Customers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const { data, isLoading, isFetching, refetch } = useAdminCustomers(debouncedSearch || undefined, page, PAGE_SIZE)
  const customers = data?.items || []
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const mobileViewport = isMobileViewport()

  const handleDeactivate = async (customer: AdminCustomerRow) => {
    setOpenMenuId(null)
    const action = customer.is_active ? 'deactivate' : 'reactivate'
    if (!window.confirm(`${customer.is_active ? 'Deactivate' : 'Reactivate'} ${customer.first_name} ${customer.last_name}?`)) return
    try {
      if (customer.is_active) {
        await deactivateCustomer(customer.id)
      } else {
        await reactivateCustomer(customer.id)
      }
      toast.success(`Customer ${action}d.`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

  const handleDelete = async (customer: AdminCustomerRow) => {
    setOpenMenuId(null)
    if (!window.confirm(`Permanently delete ${customer.first_name} ${customer.last_name}? This cannot be undone.`)) return
    try {
      await deleteCustomer(customer.id)
      toast.success('Customer deleted.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

  return (
    <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Customers</h1>
          <p className="mt-1 text-sm text-[#071f52]/58">Manage customer accounts and view booking activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportCsv(customers)}
            disabled={!customers.length}
            className="inline-flex items-center gap-2 rounded-xl border border-[#071f52]/14 bg-white px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-sm font-bold text-[#071f52] transition-colors hover:bg-[#f7f9ff] disabled:opacity-40"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search customers..."
              aria-label="Search customers"
              className="w-full sm:w-52 rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
            />
          </div>
        </div>
      </div>

      {(isLoading || customers.length > 0) ? (
        <div className="mt-6 admin-table-wrap">
          <div className="flex items-center justify-between border-b border-[#071f52]/10 bg-white px-5 py-3">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-[#071f52]/48">Show 20 per page</p>
              <button
                type="button"
                aria-label="Refresh customers"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : undefined} />
              </button>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-[#071f52]/48">Page {currentPage} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={isFetching || currentPage === 1}
                    className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={isFetching || currentPage === totalPages}
                    className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-3 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : !customers.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No customers found.
        </div>
      ) : (
         <div className="-mt-1 admin-table-wrap responsive-admin-table">
          <table className="text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48 whitespace-nowrap">MOBILE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BOOKINGS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TOTAL SPEND</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">LOCATION</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">JOINED</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">LAST LOGIN</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {customers.map((c, index) => {
                const openUp = index >= customers.length - 2

                return (
                <tr
                  key={c.id}
                  tabIndex={0}
                  aria-label={`View customer ${c.first_name} ${c.last_name}`}
                   onClick={() => {
                     if (!mobileViewport) navigate(`/admin/customers/${c.id}`)
                   }}
                   onKeyDown={(event) => {
                     if (!mobileViewport && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      navigate(`/admin/customers/${c.id}`)
                    }
                  }}
                  className="cursor-pointer hover:bg-[#f7f9ff] transition-colors focus:bg-[#f7f9ff] focus:outline-none"
                >
                   <td data-label="Customer" className="px-5 py-3">
                     <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                       <div>
                         <p className="text-sm font-bold text-[#071f52]">{c.first_name} {c.last_name}</p>
                         <p className="text-xs text-[#071f52]/48">{c.email}</p>
                       </div>
                        {mobileViewport ? (
                          <div className="flex items-center gap-1.5 md:hidden">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_active ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#e92935]/10 text-[#c91f2a]'}`}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                           <button
                             type="button"
                             aria-label={`View customer ${c.first_name} ${c.last_name}`}
                             className="rounded-lg border border-[#071f52]/10 p-2 text-[#071f52]/62 transition-colors hover:bg-[#071f52]/8"
                             onClick={(event) => {
                               event.stopPropagation()
                               navigate(`/admin/customers/${c.id}`)
                             }}
                           >
                             <Eye size={16} />
                           </button>
                            <button
                              type="button"
                              aria-label={c.is_active ? `Deactivate ${c.first_name} ${c.last_name}` : `Reactivate ${c.first_name} ${c.last_name}`}
                              title={c.is_active ? 'Deactivate account' : 'Reactivate account'}
                              className="rounded-lg border border-[#071f52]/10 p-2 text-[#071f52]/62 transition-colors hover:bg-[#071f52]/8"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDeactivate(c)
                              }}
                            >
                              {c.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${c.first_name} ${c.last_name}`}
                              title="Delete account"
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDelete(c)
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                       ) : null}
                     </div>
                   </td>
                   <td data-label="Mobile" className="px-5 py-3 whitespace-nowrap">
                    <span className="text-sm text-[#071f52]/64">{c.mobile || '—'}</span>
                  </td>
                   <td data-label="Bookings" className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">{c.bookings_count}</span>
                  </td>
                   <td data-label="Total spend" className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">{formatCurrency(c.total_spend)}</span>
                  </td>
                   <td data-label="Location" className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{locationDisplay(c)}</span>
                  </td>
                   <td data-label="Joined" className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{formatDate(c.joined_at)}</span>
                  </td>
                   <td data-label="Last login" className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{formatDate(c.last_login_at)}</span>
                   </td>
                    <td data-label="Actions" className="desktop-table-actions px-5 py-3" onClick={(event) => event.stopPropagation()}>
                     {!mobileViewport ? <div className="flex items-center gap-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_active ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#e92935]/10 text-[#c91f2a]'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                       <CustomerActions
                         customer={c}
                         openMenuId={openMenuId}
                         setOpenMenuId={setOpenMenuId}
                         openUp={openUp}
                         onDeactivate={handleDeactivate}
                         onDelete={handleDelete}
                       />
                     </div> : null}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CustomerActions({
  customer,
  openMenuId,
  setOpenMenuId,
  openUp,
  onDeactivate,
  onDelete,
}: {
  customer: AdminCustomerRow
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  openUp: boolean
  onDeactivate: (customer: AdminCustomerRow) => void
  onDelete: (customer: AdminCustomerRow) => void
}) {
  return (
    <div className="relative flex justify-start">
      <button
        type="button"
        aria-label={`Open actions for ${customer.first_name} ${customer.last_name}`}
        aria-expanded={openMenuId === customer.id}
        onClick={(event) => {
          event.stopPropagation()
          setOpenMenuId(openMenuId === customer.id ? null : customer.id)
        }}
        className="rounded-full border border-[#071f52]/12 bg-white p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
      >
        <MoreHorizontal size={16} />
      </button>

      {openMenuId === customer.id ? (
        <div className={cn(
          'absolute right-0 z-10 min-w-44 rounded-2xl border border-[#071f52]/10 bg-white p-1.5 shadow-xl',
          openUp ? 'bottom-11' : 'top-11',
        )}>
          <Link
            to={`/admin/customers/${customer.id}`}
            onClick={() => setOpenMenuId(null)}
            className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#071f52] transition-colors hover:bg-[#f7f9ff]"
          >
            View Profile
          </Link>
          <button
            type="button"
            onClick={() => onDeactivate(customer)}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#071f52] transition-colors hover:bg-[#f7f9ff]"
          >
            {customer.is_active ? 'Deactivate Account' : 'Reactivate Account'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(customer)}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#e92935] transition-colors hover:bg-[#fff4f4]"
          >
            Delete Account
          </button>
        </div>
      ) : null}
    </div>
  )
}
