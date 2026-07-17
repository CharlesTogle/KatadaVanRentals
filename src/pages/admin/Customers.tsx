import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    query.then(({ data }) => {
      if (data) setCustomers(data)
      setLoading(false)
    })
  }, [search])

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Customers</h1>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-64 rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No customers found.
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.06)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">CUSTOMER</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">MOBILE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">LOCATION</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">JOINED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {customers.map((c: any) => (
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
                    <span className="text-sm text-[#071f52]/64">
                      {[c.city, c.province].filter(Boolean).join(', ') || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">
                      {new Date(c.created_at).toLocaleDateString()}
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
