import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/services/profile-service'
import { getCustomerDocuments, getCustomerDocumentSignedUrl } from '@/services/document-service'
import { showError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { ImageViewer } from '@/components/ui/image-viewer'
import { ArrowLeft, FileText } from 'lucide-react'
import type { CustomerDocument } from '@/types/document'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

const DOC_LABELS: Record<string, string> = {
  driver_license: "Driver's License",
  valid_id: 'Other Valid ID',
  proof_of_billing: 'Proof of Billing',
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-[#16a34a]/10 text-[#16a34a]',
  rejected: 'bg-[#e92935]/10 text-[#c91f2a]',
  submitted: 'bg-[#ffd923]/20 text-[#b8860b]',
  missing: 'bg-[#071f52]/6 text-[#071f52]/48',
  expired: 'bg-[#e92935]/10 text-[#c91f2a]',
}

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>()
  const [viewing, setViewing] = useState<{ src: string; alt: string } | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => getProfile(customerId!),
    enabled: !!customerId,
  })

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['admin', 'customer-documents', customerId],
    queryFn: () => getCustomerDocuments(customerId!),
    enabled: !!customerId,
  })

  const handleView = async (doc: CustomerDocument) => {
    setOpeningId(doc.id)

    try {
      const signedUrl = await getCustomerDocumentSignedUrl(doc.file_path)

      if (doc.mime_type === 'application/pdf') {
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
        return
      }

      setViewing({
        src: signedUrl,
        alt: DOC_LABELS[doc.document_type] || 'Document',
      })
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setOpeningId(null)
    }
  }

  if (profileLoading) {
    return (
      <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
          <div className="h-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
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
    <>
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

      <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-[#071f52]/48" />
          <h2 className="text-xs font-bold text-[#071f52]/48">DOCUMENTS</h2>
        </div>
        {docsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-[#071f52]/6 animate-pulse" />)}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-[#071f52]/48">No documents uploaded.</p>
        ) : (
          <div className="divide-y divide-[#071f52]/6">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#071f52]">{DOC_LABELS[doc.document_type] || doc.document_type}</p>
                  <p className="text-xs text-[#071f52]/48 truncate">{doc.original_filename || doc.file_path}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[doc.status] || STATUS_STYLES.missing}`}>
                    {doc.status}
                  </span>
                    {doc.file_path && doc.status !== 'missing' && (
                      <button
                        type="button"
                        onClick={() => handleView(doc)}
                        disabled={openingId === doc.id}
                        className="text-xs font-bold text-[#071f52] underline hover:text-[#e92935] disabled:opacity-50"
                      >
                        {openingId === doc.id ? 'Opening...' : 'View'}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <ImageViewer
      open={!!viewing}
      onClose={() => setViewing(null)}
      src={viewing?.src || ''}
      alt={viewing?.alt || ''}
    />
    </>
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
