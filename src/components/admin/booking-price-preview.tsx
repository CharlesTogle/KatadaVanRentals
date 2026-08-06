import type { Vehicle } from '@/types/vehicle'
import type { RouteQuoteResponse } from '@/types/location'
import { calculateVehicleBookingPrice } from '@/lib/vehicle-pricing'

interface BookingPricePreviewProps {
  vehicle: Vehicle | null
  rentalModel: 'all_out' | 'self_drive' | 'all_in' | ''
  startAt: string
  endAt: string
  routeQuote: RouteQuoteResponse | null
  tollMessage?: string
  vatPercent?: number
}

export function BookingPricePreview({ vehicle, rentalModel, startAt, endAt, routeQuote, tollMessage, vatPercent = 0 }: BookingPricePreviewProps) {
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
  const vehiclePricing = calculateVehicleBookingPrice({
    rentalType: rentalModel === 'all_in' ? 'all-in' : rentalModel === 'all_out' ? 'all-out' : 'self-drive',
    mode: 'keep',
    days: durationDays,
    distanceKm: Number(routeQuote?.distanceKm ?? 0),
    basePricePerDay: vehicle!.base_price_per_day,
    distanceRatePerKm: vehicle!.peso_per_km,
    driverRatePerDay: vehicle!.driver_rate_per_day,
    carWashFee: vehicle!.car_wash_fee,
    deliveryFee: vehicle!.delivery_fee,
    securityDeposit: vehicle!.security_deposit,
    securityDepositType: vehicle!.security_deposit_type,
    excessRatePerHour: vehicle!.excess_rate_per_hour,
    autoFullDayAfterHours: vehicle!.auto_full_day_after_hours,
    twelveHourRate: vehicle!.twelve_hour_rate,
  })
  const baseTotal = vehiclePricing.baseTotal
  const driverTotal = vehiclePricing.driverTotal
  const fuelTotal = rentalModel === 'all_in' ? Number(routeQuote?.fuelEstimateAmount ?? 0) : 0
  const tollTotal = rentalModel === 'all_in' ? Number(routeQuote?.tollEstimateAmount ?? 0) : 0
  const total = vehiclePricing.total

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
        {vehiclePricing.carWash > 0 && <div className="flex justify-between"><span className="text-[#071f52]/66">Car Wash</span><span className="font-bold">₱{vehiclePricing.carWash.toLocaleString()}.00</span></div>}
        {vehiclePricing.delivery > 0 && <div className="flex justify-between"><span className="text-[#071f52]/66">Self-Drive Delivery</span><span className="font-bold">₱{vehiclePricing.delivery.toLocaleString()}.00</span></div>}
        {vehiclePricing.securityDeposit > 0 && <div className="flex justify-between"><span className="text-[#071f52]/66">Security Deposit</span><span className="font-bold">₱{vehiclePricing.securityDeposit.toLocaleString()}.00</span></div>}
        {fuelTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-[#071f52]/66">Fuel Estimate</span>
            <span className="font-bold">₱{fuelTotal.toLocaleString()}.00</span>
          </div>
        )}
        {rentalModel === 'all_in' && (
          <>
            <div className="flex justify-between">
              <span className="text-[#071f52]/66">Toll Estimate</span>
              <span className="font-bold">₱{tollTotal.toLocaleString()}.00</span>
            </div>
            {tollMessage ? <p className="text-xs font-semibold leading-5 text-[#e92935]">{tollMessage}</p> : null}
          </>
        )}
        <div className="flex justify-between border-t border-[#071f52]/10 pt-2 text-base">
          <span className="font-black">Total</span>
          <span className="font-black">₱{total.toLocaleString()}.00</span>
        </div>
        {vatPercent > 0 ? <p className="text-xs font-medium leading-5 text-[#071f52]/48">VAT ({vatPercent}%) is calculated at trip completion{rentalModel === 'all_in' ? ' after actual fuel and toll reconciliation' : ''}.</p> : null}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Vehicle is available for these dates
      </div>
    </div>
  )
}
