import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { useCustomerDocuments, useSaveCustomerDocument, useDeleteCustomerDocument } from '@/hooks/use-documents'
import { getCustomerDocumentSignedUrl } from '@/services/document-service'
import { showError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { Dialog } from '@/components/ui/dialog'
import { ImageViewer } from '@/components/ui/image-viewer'
import { Upload, CheckCircle2, Trash2, FileText } from 'lucide-react'
import type { CustomerDocument, DocumentType } from '@/types/document'

const requiredDocs = [
  { key: 'driver_license' as DocumentType, label: "Driver's License" },
  { key: 'valid_id' as DocumentType, label: 'Other Valid ID' },
  { key: 'proof_of_billing' as DocumentType, label: 'Proof of Billing' },
]

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-[#16a34a]/10 text-[#16a34a]',
  submitted: 'bg-[#ffd923]/20 text-[#b8860b]',
  rejected: 'bg-[#e92935]/10 text-[#c91f2a]',
  missing: 'bg-[#071f52]/6 text-[#071f52]/48',
  expired: 'bg-[#e92935]/10 text-[#c91f2a]',
}

export default function Documents() {
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CustomerDocument | null>(null)
  const [viewing, setViewing] = useState<{ src: string; alt: string } | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { data: documents = [], isLoading } = useCustomerDocuments(user?.id)
  const saveDocument = useSaveCustomerDocument(user?.id)
  const deleteDocument = useDeleteCustomerDocument(user?.id)

  const docsByKey = Object.fromEntries(
    documents.map((doc) => [doc.document_type, doc]),
  )

  const getDocumentLabel = (documentType: DocumentType) => {
    return requiredDocs.find((doc) => doc.key === documentType)?.label || 'Document'
  }

  const handleUploadClick = (key: string) => {
    setActiveKey(key)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeKey || !user) return
    setUploading((prev) => ({ ...prev, [activeKey]: true }))

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${activeKey}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error(showError(uploadError))
    } else {
      try {
        await saveDocument.mutateAsync({
          customer_id: user.id,
          document_type: activeKey as DocumentType,
          file_path: path,
          original_filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        })
      } catch (error) {
        toast.error(showError(error as Error))
      }
    }

    setUploading((prev) => ({ ...prev, [activeKey]: false }))
    setActiveKey(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteDocument.mutateAsync({ id: deleting.id, file_path: deleting.file_path })
      toast.success('Document deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

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
        alt: getDocumentLabel(doc.document_type),
      })
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">Documents</h1>
      <p className="mt-1 text-sm font-medium text-[#071f52]/58">Upload your IDs and billing proof for Self Drive bookings.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload document file"
      />

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#071f52]/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-32 rounded-lg bg-[#071f52]/10" />
                      <div className="h-4 w-16 rounded-full bg-[#071f52]/6" />
                    </div>
                    <div className="h-3 w-48 rounded-lg bg-[#071f52]/6" />
                  </div>
                  <div className="h-8 w-20 rounded-full bg-[#071f52]/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          requiredDocs.map((doc) => {
            const existing = docsByKey[doc.key]
            const isUploaded = !!existing

            return (
              <div key={doc.key} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#071f52]">{doc.label}</p>
                      {existing && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[existing.status] || STATUS_STYLES.missing}`}>
                          {existing.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[#071f52]/48">
                      {isUploaded ? existing.original_filename : 'Not uploaded'}
                    </p>
                    {existing && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(existing)}
                          disabled={openingId === existing.id}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#071f52] underline hover:text-[#e92935] disabled:opacity-50"
                        >
                          <FileText size={12} /> {openingId === existing.id ? 'Opening...' : 'View'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUploadClick(doc.key)}
                          disabled={uploading[doc.key]}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#071f52]/58 underline transition-colors hover:text-[#e92935] disabled:opacity-50"
                        >
                          {uploading[doc.key] ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                              Replacing...
                            </>
                          ) : (
                            'Replace'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isUploaded ? (
                      <>
                        <CheckCircle2 size={18} className="text-[#16a34a]" />
                        <button
                          type="button"
                          onClick={() => setDeleting(existing)}
                          className="rounded-lg p-1.5 text-[#071f52]/30 transition-colors hover:bg-[#e92935]/8 hover:text-[#e92935]"
                          aria-label={`Delete ${doc.label}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(doc.key)}
                        disabled={uploading[doc.key]}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#071f52] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#112458] disabled:opacity-50"
                      >
                        {uploading[doc.key] ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Upload size={13} />
                        )}
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="mt-4 text-xs font-medium leading-5 text-[#071f52]/48">
        Each document is saved automatically as soon as you add it. You can upload them one at a time.
      </p>
      <p className="mt-2 text-xs font-medium leading-5 text-[#071f52]/48">
        Ready for Self Drive? Go back to <Link to="/our-fleet" className="font-bold text-[#071f52] underline">the fleet</Link> after all three show as uploaded.
      </p>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete Document">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-[#071f52]/64">
              Are you sure you want to delete <span className="font-bold text-[#071f52]">{requiredDocs.find((d) => d.key === deleting.document_type)?.label}</span>? This cannot be undone.
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
                disabled={deleteDocument.isPending}
              >
                {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <ImageViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        src={viewing?.src || ''}
        alt={viewing?.alt || ''}
      />
    </div>
  )
}
