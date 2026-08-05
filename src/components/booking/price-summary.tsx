import type { CustomerRentalType } from '@/lib/booking-utils'
import { Button } from '@/components/ui/button'

interface PriceSummaryProps {
  rentalType: CustomerRentalType
  bookingMode?: 'dropoff' | 'keep'
  days: number
  basePricePerDay: number
  driverRatePerDay: number
  baseTotal: number
  driverTotal: number
  fuelEstimateAmount?: number
  tollEstimateAmount?: number
  tollMessage?: string
  distanceKm?: number
  baseLoading?: boolean
  fuelLoading?: boolean
  tollLoading?: boolean
  grandTotal: number
  deposit: number
  remaining: number
  submitting: boolean
  disabled?: boolean
  disabledMessage?: React.ReactNode
  error?: string
  submitLabel?: string
  footerNote?: React.ReactNode
  flaggedForManualPricing?: boolean
}

export function PriceSummary({ rentalType, bookingMode, days, basePricePerDay, driverRatePerDay, baseTotal, driverTotal, fuelEstimateAmount = 0, tollEstimateAmount = 0, tollMessage, distanceKm = 0, baseLoading = false, fuelLoading = false, tollLoading = false, grandTotal, deposit, remaining, submitting, disabled = false, disabledMessage, error, submitLabel = 'Submit Booking', footerNote = 'Your booking will be reviewed by our team before confirmation.', flaggedForManualPricing = false }: PriceSummaryProps) {
  const isDistanceMode = bookingMode === 'dropoff' && rentalType !== 'self-drive'
  const amount = (value: number, loading?: boolean) => loading
    ? <span className="font-bold text-[#071f52]/48">Computing...</span>
    : <span className="font-bold">₱{value.toLocaleString()}.00</span>

  return (
    <div className="card space-y-5 lg:rounded-[28px] lg:p-6">
      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#071f52]">Price Summary</h3>

      {flaggedForManualPricing && (
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/8 px-4 py-3">
          <p className="text-sm font-bold text-[#92400e]">Manual Pricing Required</p>
          <p className="mt-1 text-xs font-medium text-[#92400e]/80">
            Your pickup is outside our service area. Pricing will be reviewed manually by our team. No downpayment is required.
          </p>
        </div>
      )}

      {flaggedForManualPricing ? (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#071f52]/66">Total</span>
            <span className="font-bold text-[#071f52]/48">TBD</span>
          </div>
          <p className="text-xs font-semibold leading-5 text-[#071f52]/48">
            An admin will price this booking manually based on your selected route and rental details. You'll be notified when pricing is ready.
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#071f52]/66">{isDistanceMode ? `Fare (${distanceKm}km × ₱${basePricePerDay.toLocaleString()})` : `Base (${days}d × ₱${basePricePerDay.toLocaleString()})`}</span>
          {amount(baseTotal, baseLoading)}
        </div>
        {driverTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-[#071f52]/66">Driver ({days}d × ₱{driverRatePerDay.toLocaleString()})</span>
            <span className="font-bold">₱{driverTotal.toLocaleString()}.00</span>
          </div>
        )}
        {rentalType === 'all-in' && (
          <div className="flex justify-between">
            <span className="text-[#071f52]/66">Fuel Estimate</span>
            {amount(fuelEstimateAmount, fuelLoading)}
          </div>
        )}
        {rentalType === 'all-in' && (
          <>
            <div className="flex justify-between">
              <span className="text-[#071f52]/66">Toll Estimate</span>
              {amount(tollEstimateAmount, tollLoading)}
            </div>
            {tollMessage ? <p className="text-xs font-semibold leading-5 text-[#e92935]">{tollMessage}</p> : null}
            <p className="text-xs font-medium leading-5 text-[#071f52]/48">Fuel and toll are estimates only. They are not included in the total or remaining balance until trip reconciliation.</p>
          </>
        )}
        <div className="flex justify-between border-t border-[#071f52]/10 pt-3 text-base">
          <span className="font-black">Total</span>
          <span className="font-black">₱{grandTotal.toLocaleString()}.00</span>
        </div>
        {deposit > 0 && (
          <>
            <div className="flex justify-between text-base text-[#e92935]">
              <div className="max-w-[55%]">
                <p>Security Deposit (10%)</p>
                <p className="text-xs font-medium text-[#e92935]/72">10% of base fare, excluding fuel &amp; toll estimates — non-refundable</p>
              </div>
              <span className="font-bold text-[#e92935]">− ₱{deposit.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between border-t border-[#071f52]/10 pt-3 text-sm">
              <span className="font-black text-[#071f52]">Remaining Balance</span>
              <span className="font-black text-[#071f52]">₱{remaining.toLocaleString()}.00</span>
            </div>
          </>
        )}
        {rentalType === 'all-in' ? (
          <p className="text-xs font-semibold leading-5 text-[#071f52]/48">
            {bookingMode === 'dropoff'
              ? 'Computed as Pickup → Destination. Fuel and toll are estimates. Final actuals are reconciled after the trip.'
              : 'Computed as Pickup → Destination → Return. Fuel and toll are estimates. Final actuals are reconciled after the trip.'}
          </p>
        ) : null}
      </div>
      )}

      <Button type="submit" disabled={submitting || disabled}
        className="w-full bg-[#071f52] text-white shadow-[0_12px_28px_rgba(7,31,82,0.18)] hover:bg-[#112458]"
        size="lg"
      >
        {submitting ? 'Submitting...' : submitLabel}
      </Button>

      {disabled && disabledMessage ? (
        <div className="text-center text-sm font-medium leading-5 text-[#e92935]">{disabledMessage}</div>
      ) : null}

      {error ? (
        <div className="text-center text-sm font-medium leading-5 text-[#e92935]">{error}</div>
      ) : null}

      <p className="text-center text-sm font-medium leading-5 text-[#071f52]/48">
        {footerNote}
      </p>

    </div>
  )
}
