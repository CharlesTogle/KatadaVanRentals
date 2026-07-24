import { useState } from 'react'
import { useAdminCustomers } from '@/hooks/use-profile'
import { Search, Download } from 'lucide-react'
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

export default function Customers() {
  const [search, setSearch] = useState('')

  const { data: customers = [], isLoading } = useAdminCustomers(search || undefined)

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Customers</h1>
          <p className="mt-1 text-sm text-[#071f52]/58">Manage customer accounts and view booking activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => exportCsv(customers)}
            disabled={!customers.length}
            className="inline-flex items-center gap-2 rounded-xl border border-[#071f52]/14 bg-white px-4 py-2 text-sm font-bold text-[#071f52] transition-colors hover:bg-[#f7f9ff] disabled:opacity-40"
          >
            <Download size={14} />
            Export CSV
          </button>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or mobile..."
              aria-label="Search customers"
              className="w-64 rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : !customers.length ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No customers found.
        </div>
      ) : (
        <div className="mt-6 card-overflow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">MOBILE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BOOKINGS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">TOTAL SPEND</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">LOCATION</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">JOINED</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">LAST LOGIN</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#f7f9ff] transition-colors">
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-[#071f52]">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-[#071f52]/48">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{c.mobile || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">{c.bookings_count}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">{formatCurrency(c.total_spend)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{locationDisplay(c)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{formatDate(c.joined_at)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{formatDate(c.last_login_at)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_active ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#e92935]/10 text-[#c91f2a]'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
