import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function Fleet() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setVehicles(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Our Fleet</h1>
        <button className="rounded-xl bg-[#071f52] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#112458] transition-colors">
          Add Vehicle
        </button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center text-sm font-semibold text-[#071f52]/48">
          No vehicles listed yet.
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white shadow-[0_8px_24px_rgba(7,31,82,0.06)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#071f52]/10 bg-[#f7f9ff]">
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">VEHICLE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">PLATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">PASSENGERS</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">BASE PRICE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">DRIVER RATE</th>
                <th className="px-5 py-3 text-xs font-bold text-[#071f52]/48">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071f52]/6">
              {vehicles.map((v: any) => (
                <tr key={v.id} className="hover:bg-[#f7f9ff] transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">{v.name}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]/64">{v.plate_number}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[#071f52]/64">{v.passenger_count}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-bold text-[#071f52]">₱{v.base_price_per_day?.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#071f52]">₱{v.driver_rate_per_day?.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-bold',
                      v.is_available ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-50 text-red-600',
                    )}>
                      {v.is_available ? 'Available' : 'Unavailable'}
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
