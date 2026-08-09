import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useCustomerDocuments, useSaveCustomerDocument, useDeleteCustomerDocument } from '@/hooks/use-documents'
import { useFileViewer } from '@/hooks/use-file-viewer'
import { getCustomerDocumentSignedUrl } from '@/services/document-service'
import { showError } from '@/lib/errors'
import { getAcceptedMimeTypes } from '@/lib/file-upload'
import { UPLOAD_POLICIES } from '@/config/constants'
import { ACCEPTED_PROOF_OF_BILLING_DOCUMENTS } from '@/constants/documents'
import { removeUploadedFileWithQueue, uploadFile } from '@/services/upload-service'
import { toast } from '@/lib/toast'
import { logError } from '@/lib/logger'
import { Dialog } from '@/components/ui/dialog'
import { ImageViewer } from '@/components/ui/image-viewer'
import { Upload, CheckCircle2, Trash2, FileText } from 'lucide-react'
import type { CustomerDocument, DocumentType } from '@/types/document'

const requiredDocs = [
  { key: 'driver_license' as DocumentType, label: "Driver's License" },
  { key: 'valid_id' as DocumentType, label: 'Valid ID' },
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { data: documents = [], isLoading } = useCustomerDocuments(user?.id)
  const saveDocument = useSaveCustomerDocument(user?.id)
  const deleteDocument = useDeleteCustomerDocument(user?.id)
  const { viewing, openingId, openFile, closeViewer } = useFileViewer((error) => {
    toast.error(showError(error))
  })

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
    const previousPath = docsByKey[activeKey]?.file_path
    const path = previousPath ? `${user.id}/${activeKey}-${crypto.randomUUID()}.${ext}` : `${user.id}/${activeKey}.${ext}`
    let saved = false
    try {
      await uploadFile({ bucket: 'customer-documents', file, path, policy: UPLOAD_POLICIES.customerDocuments, upsert: true })
      try {
        await saveDocument.mutateAsync({
          customer_id: user.id,
          document_type: activeKey as DocumentType,
          file_path: path,
          original_filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        })
        saved = true
      } catch (error) {
        await removeUploadedFileWithQueue('customer-documents', path).catch((cleanupError) => {
          logError('documents', 'Failed to remove document upload after metadata failure', cleanupError)
        })
        toast.error(showError(error as Error))
      }
      if (saved && previousPath) await removeUploadedFileWithQueue('customer-documents', previousPath).catch((cleanupError) => {
        logError('documents', 'Failed to remove previous customer document', cleanupError)
      })
    } catch (error) {
      toast.error(showError(error as Error))
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
    await openFile({
      id: doc.id,
      path: doc.file_path,
      alt: getDocumentLabel(doc.document_type),
      resolveUrl: getCustomerDocumentSignedUrl,
      isPdf: doc.mime_type === 'application/pdf',
    })
  }

  return (
    <div className="w-full px-3 py-4 sm:px-5 sm:py-6">
      <h1 className="text-lg font-black tracking-[-0.02em] text-[#071f52] sm:text-2xl sm:tracking-[-0.03em]">Documents</h1>
      <p className="mt-0.5 text-xs font-medium text-[#071f52]/58 sm:text-sm">Upload your IDs and billing proof for Self Drive bookings.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedMimeTypes(UPLOAD_POLICIES.customerDocuments)}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload document file"
      />

      <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
        {isLoading ? (
          <div className="space-y-2 animate-pulse sm:space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border border-[#071f52]/10 bg-white p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="h-3.5 w-28 rounded bg-[#071f52]/10 sm:h-4 sm:w-32" />
                      <div className="h-3.5 w-14 rounded-full bg-[#071f52]/6 sm:h-4 sm:w-16" />
                    </div>
                    <div className="h-2.5 w-40 rounded bg-[#071f52]/6 sm:h-3 sm:w-48" />
                  </div>
                  <div className="h-7 w-16 rounded-full bg-[#071f52]/6 sm:h-8 sm:w-20" />
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
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="text-xs font-bold text-[#071f52] sm:text-sm">{doc.label}</p>
                      {existing && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold sm:px-2.5 sm:py-0.5 sm:text-[10px] ${STATUS_STYLES[existing.status] || STATUS_STYLES.missing}`}>
                          {existing.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium text-[#071f52]/48 sm:text-xs">
                      {isUploaded ? existing.original_filename : 'Not uploaded'}
                    </p>
                    {doc.key === 'proof_of_billing' && (
                      <div className="mt-2 text-[10px] font-medium text-[#071f52]/58 sm:text-xs">
                        <p>Accepted documents:</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {ACCEPTED_PROOF_OF_BILLING_DOCUMENTS.map((document) => <li key={document}>{document}</li>)}
                        </ul>
                      </div>
                    )}
                    {existing && (
                      <div className="mt-1.5 flex items-center gap-1.5 sm:mt-2 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(existing)}
                          disabled={openingId === existing.id}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#071f52] underline hover:text-[#e92935] disabled:opacity-50 sm:text-xs"
                        >
                          <FileText size={10} className="sm:hidden" />
                          <FileText size={12} className="hidden sm:block" />
                          {openingId === existing.id ? 'Opening...' : 'View'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUploadClick(doc.key)}
                          disabled={uploading[doc.key]}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#071f52]/58 underline transition-colors hover:text-[#e92935] disabled:opacity-50 sm:text-xs sm:gap-1.5"
                        >
                          {uploading[doc.key] ? (
                            <>
                              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current/20 border-t-current sm:h-3 sm:w-3" />
                              Replacing...
                            </>
                          ) : (
                            'Replace'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {isUploaded ? (
                      <>
                        <CheckCircle2 size={15} className="text-[#16a34a] sm:hidden" />
                        <CheckCircle2 size={18} className="text-[#16a34a] hidden sm:block" />
                        <button
                          type="button"
                          onClick={() => setDeleting(existing)}
                          className="rounded p-1 text-[#071f52]/30 transition-colors hover:bg-[#e92935]/8 hover:text-[#e92935] sm:p-1.5"
                          aria-label={`Delete ${doc.label}`}
                        >
                          <Trash2 size={13} className="sm:hidden" />
                          <Trash2 size={15} className="hidden sm:block" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(doc.key)}
                        disabled={uploading[doc.key]}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-[#071f52] px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-[#112458] disabled:opacity-50 sm:px-4 sm:py-2 sm:text-xs sm:gap-1.5"
                      >
                        {uploading[doc.key] ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white sm:h-3.5 sm:w-3.5" />
                        ) : (
                          <Upload size={11} className="sm:hidden" />
                        )}
                        <Upload size={13} className="hidden sm:block" />
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

      <p className="mt-3 text-[10px] font-medium leading-5 text-[#071f52]/48 sm:mt-4 sm:text-xs">
        Each document is saved automatically as soon as you add it. You can upload them one at a time.
      </p>
      <p className="mt-1.5 text-[10px] font-medium leading-5 text-[#071f52]/48 sm:mt-2 sm:text-xs">
        Ready for Self Drive? Go back to <Link to="/our-fleet" className="font-bold text-[#071f52] underline">the fleet</Link> after all three show as uploaded.
      </p>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete Document">
        {deleting && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs text-[#071f52]/64 sm:text-sm">
              Are you sure you want to delete <span className="font-bold text-[#071f52]">{requiredDocs.find((d) => d.key === deleting.document_type)?.label}</span>? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <button
                className="rounded-lg border border-[#071f52]/14 px-3 py-1.5 text-xs font-semibold text-[#071f52] hover:bg-[#f7f9ff] transition-colors sm:px-4 sm:py-2 sm:text-sm"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
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
        onClose={closeViewer}
        src={viewing?.src || ''}
        alt={viewing?.alt || ''}
      />
    </div>
  )
}
