import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PriceSummaryProps {
  vehicleName: string
  basePricePerDay: number
  driverRatePerDay: number
  submitting: boolean
  disabled?: boolean
}

export function PriceSummary({ vehicleName, basePricePerDay, driverRatePerDay, submitting, disabled = false }: PriceSummaryProps) {
  const [searchParams] = useSearchParams()
  const rentalType = (searchParams.get('type') || 'self-drive') as 'self-drive' | 'with-driver'
  const startParam = searchParams.get('start') || ''
  const endParam = searchParams.get('end') || ''

  const startDate = startParam ? new Date(startParam) : null
  const endDate = endParam ? new Date(endParam) : null
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const baseTotal = days * basePricePerDay
  const driverTotal = rentalType === 'with-driver' ? days * driverRatePerDay : 0
  const grandTotal = baseTotal + driverTotal
  const deposit = rentalType === 'self-drive' ? Math.round(baseTotal * 0.1) : 0
  const remaining = grandTotal - deposit

  return (
    <div className="card">
      <h3 className="text-base font-black text-[#071f52]">Price Summary</h3>
      <p className="text-xs font-medium text-[#071f52]/48">{vehicleName} · {days}d</p>

      <div className="mt-4 space-y-2 text-sm">
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
        <div className="flex justify-between border-t border-[#071f52]/10 pt-2 text-base">
          <span className="font-black">Total</span>
          <span className="font-black">₱{grandTotal.toLocaleString()}.00</span>
        </div>
        {rentalType === 'self-drive' && deposit > 0 && (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-[#071f52]/58">Down payment (10%)</span>
              <span className="font-bold text-[#e92935]">− ₱{deposit.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between border-t border-[#071f52]/10 pt-2 text-sm">
              <span className="font-black text-[#071f52]">Remaining Balance</span>
              <span className="font-black text-[#071f52]">₱{remaining.toLocaleString()}.00</span>
            </div>
            <p className="text-[10px] font-medium text-[#071f52]/38">(due at pickup)</p>
          </>
        )}
      </div>

      <Button type="submit" disabled={submitting || disabled}
        className="mt-5 w-full bg-[#e92935] text-white shadow-[0_8px_20px_rgba(233,41,53,0.2)] hover:bg-[#c91f2a]"
        size="lg"
      >
        {submitting ? 'Submitting...' : 'Submit Booking'}
      </Button>

      <p className="mt-3 text-[10px] font-medium leading-4 text-[#071f52]/38 text-center">
        Booking will be sent for admin review. You will receive a confirmation once reviewed.
      </p>
    </div>
  )
}
