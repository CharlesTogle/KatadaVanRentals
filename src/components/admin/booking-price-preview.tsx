import type { Vehicle } from '@/types/vehicle'

interface BookingPricePreviewProps {
  vehicle: Vehicle | null
  rentalModel: 'all_out' | 'self_drive' | 'all_in' | ''
  startAt: string
  endAt: string
}

export function BookingPricePreview({ vehicle, rentalModel, startAt, endAt }: BookingPricePreviewProps) {
  const startDate = startAt ? new Date(startAt) : null
  const endDate = endAt ? new Date(endAt) : null
  const hasRequired = !!vehicle && !!rentalModel && !!startDate && !!endDate && endDate > startDate

  if (!hasRequired) {
    return (
      <div className="rounded-2xl border border-[#071f52]/10 bg-[#f7f9ff] p-5">
        <p className="text-sm font-semibold text-[#071f52]/48">
          Select a vehicle and the pick-up / drop-off date & time to see the computed price.
        </p>
      </div>
    )
  }

  const durationMs = endDate!.getTime() - startDate!.getTime()
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)))
  const baseTotal = durationDays * vehicle!.base_price_per_day
  const driverTotal = (rentalModel === 'all_in' || rentalModel === 'all_out')
    ? durationDays * vehicle!.driver_rate_per_day
    : 0
  const total = baseTotal + driverTotal

  return (
    <div className="rounded-2xl border border-[#071f52]/10 bg-white p-5">
      <h3 className="text-sm font-black text-[#071f52]">Price Summary</h3>
      <p className="mt-0.5 text-xs font-medium text-[#071f52]/48">
        {vehicle!.name} · {durationDays} day{durationDays > 1 ? 's' : ''}
      </p>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#071f52]/66">Base ({durationDays}d × ₱{vehicle!.base_price_per_day.toLocaleString()})</span>
          <span className="font-bold">₱{baseTotal.toLocaleString()}.00</span>
        </div>
        {driverTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-[#071f52]/66">Driver ({durationDays}d × ₱{vehicle!.driver_rate_per_day.toLocaleString()})</span>
            <span className="font-bold">₱{driverTotal.toLocaleString()}.00</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[#071f52]/10 pt-2 text-base">
          <span className="font-black">Total</span>
          <span className="font-black">₱{total.toLocaleString()}.00</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Vehicle is available for these dates
      </div>
    </div>
  )
}
