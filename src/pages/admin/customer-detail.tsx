import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/services/profile-service'
import { ArrowLeft } from 'lucide-react'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => getProfile(customerId!),
    enabled: !!customerId,
  })

  if (isLoading) {
    return (
      <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
          <div className="h-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Link to="/admin/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-[#071f52]/60 hover:text-[#071f52] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-12 text-center">
          <p className="text-sm font-bold text-[#071f52]/48">Customer not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Link to="/admin/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-[#071f52]/60 hover:text-[#071f52] mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="mt-1 text-sm text-[#071f52]/58">{profile.email}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${profile.is_active ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#e92935]/10 text-[#c91f2a]'}`}>
          {profile.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="text-xs font-bold text-[#071f52]/48 mb-3">CONTACT</h2>
          <Row label="Email" value={profile.email} />
          <Row label="Mobile" value={profile.mobile || '—'} />
          <Row label="Address" value={profile.address || '—'} />
          <Row label="City" value={profile.city || '—'} />
          <Row label="Province" value={profile.province || '—'} />
          <Row label="ZIP Code" value={profile.zip_code || '—'} />
          <Row label="Country" value={profile.country} />
        </div>

        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
          <h2 className="text-xs font-bold text-[#071f52]/48 mb-3">ACCOUNT</h2>
          <Row label="Role" value={profile.role} />
          <Row label="Joined" value={formatDate(profile.created_at)} />
          <Row label="Last Login" value={formatDate(profile.last_login_at)} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#071f52]/6 last:border-0">
      <span className="text-sm text-[#071f52]/58">{label}</span>
      <span className="text-sm font-semibold text-[#071f52] text-right">{value}</span>
    </div>
  )
}
