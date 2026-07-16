import { useState } from 'react'
import { Upload, CheckCircle2 } from 'lucide-react'

const requiredDocs = [
  { key: 'driver_license', label: "Driver's License" },
  { key: 'valid_id', label: 'Other Valid ID' },
  { key: 'proof_of_billing', label: 'Proof of Billing' },
]

export default function Documents() {
  const [uploads, setUploads] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const handleUpload = async (key: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading((prev) => ({ ...prev, [key]: true }))
      // ponytail: upload to Supabase storage
      await new Promise((r) => setTimeout(r, 1200))
      setUploads((prev) => ({ ...prev, [key]: file.name }))
      setUploading((prev) => ({ ...prev, [key]: false }))
    }
    input.click()
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52] sm:text-3xl">Documents</h1>
      <p className="mt-1 text-sm font-medium text-[#071f52]/58">Upload your IDs and billing proof for Self Drive bookings.</p>

      <div className="mt-6 space-y-3">
        {requiredDocs.map((doc) => (
          <div
            key={doc.key}
            className="rounded-2xl border border-[#071f52]/10 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,82,0.06)]"
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
                  onClick={() => handleUpload(doc.key)}
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
    </div>
  )
}
