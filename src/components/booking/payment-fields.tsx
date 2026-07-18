import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBookingStore } from '@/store/booking-store'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'

export function PaymentFields() {
  const [searchParams] = useSearchParams()
  const rentalType = searchParams.get('type') || 'self-drive'
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

  if (rentalType !== 'self-drive') return null

  const methodLabel = (pmId: string) => {
    const pm = paymentMethods.find(m => m.id === pmId)
    if (!pm) return ''
    return `${pm.provider}${pm.account_number ? ` (${pm.account_number})` : ''} · ${pm.channel === 'bank_transfer' ? 'Bank Transfer' : 'E-Wallet'}`
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#071f52]">Payment Method</label>
        <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        >
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>{methodLabel(pm.id)}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#071f52]">Amount (pre-filled with deposit)</label>
        <input value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
          placeholder="Deposit amount"
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#071f52]">Reference Number</label>
        <input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
          placeholder="Transaction / Ref #"
          className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#071f52]">Receipt (JPG, PNG, WEBP, PDF — max 5 MB)</label>
        <label className={cn(
          'flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-semibold transition-colors',
          receiptFile
            ? 'border-[#16a34a]/40 bg-[#16a34a]/6 text-[#16a34a]'
            : 'border-[#071f52]/14 bg-[#f7f9ff] text-[#071f52]/48 hover:border-[#071f52]/30',
        )}>
          <Upload size={18} />
          {receiptFile ? receiptFile.name : 'Drag & drop or click to upload'}
          <input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
      </div>
    </div>
  )
}
