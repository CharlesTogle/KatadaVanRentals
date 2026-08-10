import { useEffect, useMemo, useState } from 'react'
import { useBookingStore } from '@/store/booking-store'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { cn } from '@/lib/utils'
import { getAcceptedMimeTypes, validateFile } from '@/lib/file-upload'
import { UPLOAD_POLICIES } from '@/config/constants'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'
import { Upload } from 'lucide-react'

const channelLabels: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  ewallet: 'E-Wallet',
  online_gateway: 'Online Gateway',
}

interface PaymentFieldsProps {
  depositAmount: number
  methodRequired?: boolean
  receiptRequired?: boolean
  autoSelectMethod?: boolean
}

export function PaymentFields({ depositAmount, methodRequired = true, receiptRequired = true, autoSelectMethod = true }: PaymentFieldsProps) {
  const payment = useBookingStore((s) => s.payment)
  const setPayment = useBookingStore((s) => s.setPayment)
  const receiptFile = useBookingStore((s) => s.receiptFile)
  const setReceiptFile = useBookingStore((s) => s.setReceiptFile)
  const { data: paymentMethods = [] } = usePaymentMethods()
  const [qrLoading, setQrLoading] = useState(false)
  const [receiptUploadError, setReceiptUploadError] = useState(false)
  const customerPaymentMethods = useMemo(
    () => paymentMethods.filter((method) => method.channel !== 'cash'),
    [paymentMethods],
  )
  const handleReceiptChange = (file: File | undefined) => {
    if (!file) return
    try {
      validateFile(file, UPLOAD_POLICIES.paymentReceipts)
      setReceiptFile(file)
      setReceiptUploadError(false)
    } catch (error) {
      setReceiptFile(null)
      setReceiptUploadError(true)
      toast.error(showError(error))
    }
  }

  const selectedMethod = useMemo(
    () => customerPaymentMethods.find((m) => m.id === payment.method) ?? null,
    [customerPaymentMethods, payment.method],
  )

  useEffect(() => {
    setQrLoading(Boolean(selectedMethod?.qr_image_path))
  }, [selectedMethod?.id, selectedMethod?.qr_image_path])

  useEffect(() => {
    if (autoSelectMethod && customerPaymentMethods.length && !customerPaymentMethods.some((method) => method.id === payment.method)) {
      setPayment({ method: customerPaymentMethods[0].id })
    }
  }, [autoSelectMethod, customerPaymentMethods, payment.method, setPayment])

  useEffect(() => {
    if (payment.amount !== String(depositAmount)) {
      setPayment({ amount: String(depositAmount) })
    }
  }, [depositAmount, payment.amount, setPayment])

  const methodLabel = (pmId: string) => {
    const pm = customerPaymentMethods.find(m => m.id === pmId)
    if (!pm) return ''
    const channel = channelLabels[pm.channel] || pm.channel
    return `${pm.provider}${pm.account_number ? ` (${pm.account_number})` : ''} · ${channel}`
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-[#071f52]">Payment Method {methodRequired ? <span className="text-[#e92935]">*</span> : null}</label>
        <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        >
          {!customerPaymentMethods.length || !autoSelectMethod ? <option value="">- Select payment method -</option> : null}
          {customerPaymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>{methodLabel(pm.id)}</option>
          ))}
        </select>
      </div>

      {selectedMethod && (
        <div className="rounded-2xl border border-[#071f52]/10 bg-[#f7f9ff] p-4 space-y-3">
          <p className="text-xs font-bold text-[#071f52]">PAYMENT DETAILS</p>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <span className="font-medium text-[#071f52]/58">Provider:</span>{' '}
              <span className="font-bold text-[#071f52]">{selectedMethod.provider}</span>
            </div>
            {selectedMethod.account_name && (
              <div>
                <span className="font-medium text-[#071f52]/58">Account Name:</span>{' '}
                <span className="font-bold text-[#071f52]">{selectedMethod.account_name}</span>
              </div>
            )}
            {selectedMethod.account_number && (
              <div>
                <span className="font-medium text-[#071f52]/58">Account #:</span>{' '}
                <span className="font-bold font-mono text-[#071f52]">{selectedMethod.account_number}</span>
              </div>
            )}
            {selectedMethod.account_type && (
              <div>
                <span className="font-medium text-[#071f52]/58">Type:</span>{' '}
                <span className="font-bold text-[#071f52]">{selectedMethod.account_type}</span>
              </div>
            )}
            {selectedMethod.branch && (
              <div>
                <span className="font-medium text-[#071f52]/58">Branch:</span>{' '}
                <span className="font-bold text-[#071f52]">{selectedMethod.branch}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-[#071f52]/58">Currency:</span>{' '}
              <span className="font-bold text-[#071f52]">{selectedMethod.currency}</span>
            </div>
            <div>
              <span className="font-medium text-[#071f52]/58">Channel:</span>{' '}
              <span className="font-bold text-[#071f52]">{channelLabels[selectedMethod.channel] || selectedMethod.channel}</span>
            </div>
          </div>

          {selectedMethod.instructions && (
            <div className="rounded-xl border border-[#071f52]/10 bg-white p-3">
              <p className="text-xs font-semibold text-[#071f52] whitespace-pre-wrap">{selectedMethod.instructions}</p>
            </div>
          )}

          {selectedMethod.qr_image_path && (
            <div className="flex justify-center">
              <div className="relative h-36 w-36">
                {qrLoading ? <div className="absolute inset-0 animate-pulse rounded-xl border border-[#071f52]/10 bg-[#071f52]/8" aria-label="Loading QR code" /> : null}
                <img
                  key={selectedMethod.qr_image_path}
                  src={selectedMethod.qr_image_path}
                  alt="QR Code"
                  onLoad={() => setQrLoading(false)}
                  className={cn('h-36 w-36 rounded-xl border border-[#071f52]/10 object-contain transition-opacity duration-200', qrLoading ? 'opacity-0' : 'opacity-100')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Security Deposit (downpayment) 10% <span className="text-[#e92935]">*</span></label>
          <input value={`₱ ${depositAmount.toLocaleString()}`} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/72"
          />
          <p className="text-xs font-medium text-[#071f52]/48">Automatically set by the booking policy for this rental.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Reference # <span className="text-[#e92935]">*</span></label>
          <input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
            placeholder="Transaction / Ref #"
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-[#071f52]">Upload Receipt / Proof of Payment {receiptRequired ? <span className="text-[#e92935]">*</span> : null}</label>
          <label className="cursor-pointer rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#112458]">
            Choose File
            <input type="file" accept={getAcceptedMimeTypes(UPLOAD_POLICIES.paymentReceipts)} onChange={(e) => handleReceiptChange(e.target.files?.[0])} className="hidden" />
          </label>
        </div>
        <label className={cn(
          'flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm font-semibold transition-colors',
          receiptFile
            ? 'border-[#16a34a]/40 bg-[#16a34a]/6 text-[#16a34a]'
            : 'border-[#071f52]/14 bg-[#f7f9ff] text-[#071f52]/48 hover:border-[#071f52]/30',
        )}>
          <Upload size={28} />
          <span>{receiptFile ? receiptFile.name : 'Click or drag & drop your receipt here'}</span>
          <span className="text-xs font-medium">JPG, PNG, WEBP, PDF - max 5 MiB</span>
          <input type="file" accept={getAcceptedMimeTypes(UPLOAD_POLICIES.paymentReceipts)} onChange={(e) => handleReceiptChange(e.target.files?.[0])} className="hidden" />
        </label>
        <p className={cn('text-xs font-medium', receiptUploadError ? 'text-[#e92935]' : 'text-[#071f52]/48')}>Uploaded images must not exceed 5 MB.</p>
        {!receiptRequired ? <p className="text-xs font-medium text-[#071f52]/48">Receipt is optional for admin-created bookings.</p> : null}
      </div>
    </div>
  )
}
