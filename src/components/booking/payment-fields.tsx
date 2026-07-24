import { useEffect } from 'react'
import { useBookingStore } from '@/store/booking-store'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'

export function PaymentFields({ depositAmount }: { depositAmount: number }) {
  const payment = useBookingStore((s) => s.payment)
  const setPayment = useBookingStore((s) => s.setPayment)
  const receiptFile = useBookingStore((s) => s.receiptFile)
  const setReceiptFile = useBookingStore((s) => s.setReceiptFile)
  const { data: paymentMethods = [] } = usePaymentMethods()

  useEffect(() => {
    if (paymentMethods.length && !payment.method) {
      setPayment({ method: paymentMethods[0].id })
    }
  }, [paymentMethods, payment.method, setPayment])

  useEffect(() => {
    if (payment.amount !== String(depositAmount)) {
      setPayment({ amount: String(depositAmount) })
    }
  }, [depositAmount, payment.amount, setPayment])

  const methodLabel = (pmId: string) => {
    const pm = paymentMethods.find(m => m.id === pmId)
    if (!pm) return ''
    return `${pm.provider}${pm.account_number ? ` (${pm.account_number})` : ''} · ${pm.channel === 'bank_transfer' ? 'Bank Transfer' : 'E-Wallet'}`
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-[#071f52]">Payment Method <span className="text-[#e92935]">*</span></label>
        <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        >
          {!paymentMethods.length ? <option value="">- Select payment method -</option> : null}
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>{methodLabel(pm.id)}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Security Deposit <span className="text-[#e92935]">*</span></label>
          <input value={`₱ ${depositAmount.toLocaleString()}`} readOnly
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-gray-100 px-4 py-3 text-base font-semibold text-[#071f52]/72"
          />
          <p className="text-xs font-medium text-[#071f52]/48">Automatically set to 10% of total rental</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#071f52]">Reference Number</label>
          <input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
            placeholder="Transaction / Ref #"
            className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-base font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-[#071f52]">Upload Receipt / Proof of Payment <span className="text-[#e92935]">*</span></label>
          <label className="cursor-pointer rounded-xl bg-[#071f52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#112458]">
            Choose File
            <input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" />
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
          <span className="text-xs font-medium">JPG, PNG, WEBP, PDF - max 5 MB</span>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
      </div>
    </div>
  )
}
