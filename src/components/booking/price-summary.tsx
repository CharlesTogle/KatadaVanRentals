import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PriceSummaryProps {
  rentalType: 'self-drive' | 'with-driver'
  days: number
  basePricePerDay: number
  driverRatePerDay: number
  baseTotal: number
  driverTotal: number
  grandTotal: number
  deposit: number
  remaining: number
  submitting: boolean
  disabled?: boolean
  disabledMessage?: React.ReactNode
}

export function PriceSummary({ rentalType, days, basePricePerDay, driverRatePerDay, baseTotal, driverTotal, grandTotal, deposit, remaining, submitting, disabled = false, disabledMessage }: PriceSummaryProps) {
  return (
    <div className="card space-y-5 lg:rounded-[28px] lg:p-6">
      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#071f52]">Price Summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#071f52]/66">Base ({days}d × ₱{basePricePerDay.toLocaleString()})</span>
          <span className="font-bold">₱{baseTotal.toLocaleString()}.00</span>
        </div>
        {rentalType === 'with-driver' && (
          <div className="flex justify-between">
            <span className="text-[#071f52]/66">Driver ({days}d × ₱{driverRatePerDay.toLocaleString()})</span>
            <span className="font-bold">₱{driverTotal.toLocaleString()}.00</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[#071f52]/10 pt-3 text-base">
          <span className="font-black">Total</span>
          <span className="font-black">₱{grandTotal.toLocaleString()}.00</span>
        </div>
        {deposit > 0 && (
          <>
            <div className="flex justify-between text-base text-[#e92935]">
              <div>
                <p>Security Deposit (10%)</p>
                <p className="text-xs font-medium text-[#e92935]/72">due now, non-refundable</p>
              </div>
              <span className="font-bold text-[#e92935]">− ₱{deposit.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between border-t border-[#071f52]/10 pt-3 text-sm">
              <span className="font-black text-[#071f52]">Remaining Balance</span>
              <span className="font-black text-[#071f52]">₱{remaining.toLocaleString()}.00</span>
            </div>
          </>
        )}
      </div>

      <Button type="submit" disabled={submitting || disabled}
        className="w-full bg-[#071f52] text-white shadow-[0_12px_28px_rgba(7,31,82,0.18)] hover:bg-[#112458]"
        size="lg"
      >
        {submitting ? 'Submitting...' : 'Submit Booking'}
      </Button>

      {disabled && disabledMessage ? (
        <div className="text-center text-sm font-medium leading-5 text-[#e92935]">{disabledMessage}</div>
      ) : null}

      <p className="text-center text-sm font-medium leading-5 text-[#071f52]/48">
        Your booking will be reviewed by our team before confirmation.
      </p>

      {rentalType === 'self-drive' && disabled ? (
        <p className="text-center text-sm font-medium text-[#071f52]/48">
          Need to upload documents first? <Link to="/documents" className="font-bold text-[#071f52] underline">Go to Documents</Link>
        </p>
      ) : null}
    </div>
  )
}
