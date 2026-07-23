import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { useCustomerDocuments, useSaveCustomerDocument } from '@/hooks/use-documents'
import { showError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { Upload, CheckCircle2 } from 'lucide-react'

const requiredDocs = [
  { key: 'driver_license', label: "Driver's License" },
  { key: 'valid_id', label: 'Other Valid ID' },
  { key: 'proof_of_billing', label: 'Proof of Billing' },
]

export default function Documents() {
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { data: documents = [], isLoading } = useCustomerDocuments(user?.id)
  const saveDocument = useSaveCustomerDocument(user?.id)

  const uploads = Object.fromEntries(
    documents.map((document) => [document.document_type, document.original_filename || 'Uploaded document']),
  )

  const handleUploadClick = (key: string) => {
    setActiveKey(key)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeKey || !user) return
    setUploading((prev) => ({ ...prev, [activeKey]: true }))

    const ext = file.name.split('.').pop()
    const path = `customer-documents/${user.id}/${activeKey}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error(showError(uploadError))
    } else {
      try {
        await saveDocument.mutateAsync({
          customer_id: user.id,
          document_type: activeKey as 'driver_license' | 'valid_id' | 'proof_of_billing',
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
        {isLoading && (
          <div className="rounded-2xl border border-[#071f52]/10 bg-white p-4 text-sm font-semibold text-[#071f52]/48">
            Loading your uploaded documents...
          </div>
        )}
        {requiredDocs.map((doc) => (
          <div
            key={doc.key}
            className="card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#071f52]">{doc.label}</p>
                <p className="mt-0.5 text-xs font-medium text-[#071f52]/48">
                  {uploads[doc.key] ? `Uploaded: ${uploads[doc.key]}` : 'Not uploaded'}
                </p>
              </div>
               {uploads[doc.key] ? (
                 <CheckCircle2 size={20} className="shrink-0 text-[#16a34a]" />
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
        ))}
      </div>

      <p className="mt-4 text-xs font-medium leading-5 text-[#071f52]/48">
        Each document is saved automatically as soon as you add it. You can upload them one at a time.
      </p>
      <p className="mt-2 text-xs font-medium leading-5 text-[#071f52]/48">
        Ready for Self Drive? Go back to <Link to="/our-fleet" className="font-bold text-[#071f52] underline">the fleet</Link> after all three show as uploaded.
      </p>
    </div>
  )
}
