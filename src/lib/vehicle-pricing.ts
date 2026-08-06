import type { CustomerRentalType, BookingMode } from '@/lib/booking-utils'

export type SecurityDepositType = 'fixed' | 'percent'

export interface VehiclePricingInput {
  rentalType: CustomerRentalType
  mode: BookingMode
  days: number
  distanceKm: number
  basePricePerDay: number
  distanceRatePerKm: number
  driverRatePerDay: number
  carWashFee: number
  deliveryFee: number
  securityDeposit: number
  securityDepositType: SecurityDepositType
  excessRatePerHour: number
  autoFullDayAfterHours: number
  twelveHourRate: number | null
  overdueHours?: number
}

export interface PriceLineItem {
  label: string
  detail: string
  amount: number
}

export function calculateOverdueCharge(input: Pick<VehiclePricingInput, 'basePricePerDay' | 'excessRatePerHour' | 'autoFullDayAfterHours' | 'twelveHourRate' | 'overdueHours'>) {
  const hours = Math.max(0, Math.ceil(input.overdueHours ?? 0))
  if (!hours) return { amount: 0, hours: 0, label: '' }

  const fullDayHours = Math.max(1, input.autoFullDayAfterHours)
  const fullDays = Math.floor(hours / fullDayHours)
  const remainingHours = hours % fullDayHours
  const fullDayAmount = fullDays * input.basePricePerDay
  const partialAmount = remainingHours >= 12 && input.twelveHourRate != null
    ? input.twelveHourRate
    : remainingHours * input.excessRatePerHour
  const amount = fullDayAmount + partialAmount
  const label = fullDays > 0 ? 'Overdue Full Day' : remainingHours >= 12 && input.twelveHourRate != null ? 'Overdue 12-Hour Rate' : 'Overdue Excess Hours'

  return { amount, hours, label }
}

export function calculateVehicleBookingPrice(input: VehiclePricingInput) {
  const baseTotal = input.mode === 'dropoff' && input.rentalType !== 'self-drive'
    ? input.distanceKm * input.distanceRatePerKm
    : input.days * input.basePricePerDay
  const driverTotal = input.rentalType !== 'self-drive' && input.mode === 'keep'
    ? input.days * input.driverRatePerDay
    : 0
  const carWash = input.carWashFee > 0 ? input.carWashFee : 0
  const delivery = input.rentalType === 'self-drive' && input.deliveryFee > 0 ? input.deliveryFee : 0
  const rentalTotal = baseTotal + driverTotal + carWash + delivery
  const securityDeposit = input.securityDepositType === 'percent'
    ? Math.round(rentalTotal * input.securityDeposit) / 100
    : input.securityDeposit
  const overdue = calculateOverdueCharge(input)
  const total = rentalTotal + securityDeposit + overdue.amount

  const priceLineItems: PriceLineItem[] = [
    { label: 'Base', detail: input.mode === 'dropoff' && input.rentalType !== 'self-drive'
      ? `${input.distanceKm}km × ₱${input.distanceRatePerKm}`
      : `${input.days}d × ₱${input.basePricePerDay}`, amount: baseTotal },
  ]
  if (driverTotal > 0) priceLineItems.push({ label: 'Driver', detail: `${input.days}d × ₱${input.driverRatePerDay}`, amount: driverTotal })
  if (carWash > 0) priceLineItems.push({ label: 'Car Wash', detail: 'Vehicle fee', amount: carWash })
  if (delivery > 0) priceLineItems.push({ label: 'Self-Drive Delivery', detail: 'Vehicle fee', amount: delivery })
  if (securityDeposit > 0) priceLineItems.push({ label: 'Security Deposit', detail: input.securityDepositType, amount: securityDeposit })
  if (overdue.amount > 0) priceLineItems.push({ label: overdue.label, detail: `${overdue.hours} started hour(s)`, amount: overdue.amount })

  return { baseTotal, driverTotal, carWash, delivery, securityDeposit, overdue, total, priceLineItems }
}
