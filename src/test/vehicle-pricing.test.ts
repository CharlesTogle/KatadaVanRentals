import { describe, expect, it } from 'vitest'
import { calculateOverdueCharge, calculateVehicleBookingPrice } from '@/lib/vehicle-pricing'

describe('vehicle pricing', () => {
  it('applies configured booking fees without hardcoded amounts', () => {
    const result = calculateVehicleBookingPrice({
      rentalType: 'self-drive',
      mode: 'keep',
      days: 3,
      distanceKm: 0,
      basePricePerDay: 1000,
      distanceRatePerKm: 500,
      driverRatePerDay: 1250,
      carWashFee: 250,
      deliveryFee: 500,
      securityDeposit: 700,
      securityDepositType: 'fixed',
      excessRatePerHour: 300,
      autoFullDayAfterHours: 18,
      twelveHourRate: 1200,
    })

    expect(result.baseTotal).toBe(3000)
    expect(result.carWash).toBe(250)
    expect(result.delivery).toBe(500)
    expect(result.securityDeposit).toBe(700)
    expect(result.total).toBe(4450)
  })

  it('uses the vehicle distance rate for driver drop-offs', () => {
    const result = calculateVehicleBookingPrice({
      rentalType: 'all-out', mode: 'dropoff', days: 1, distanceKm: 12,
      basePricePerDay: 1000, distanceRatePerKm: 500, driverRatePerDay: 1250,
      carWashFee: 250, deliveryFee: 0, securityDeposit: 25,
      securityDepositType: 'percent', excessRatePerHour: 300,
      autoFullDayAfterHours: 18, twelveHourRate: 1200,
    })

    expect(result.baseTotal).toBe(6000)
    expect(result.priceLineItems[0]).toEqual({ label: 'Base', detail: '12km × ₱500', amount: 6000 })
  })

  it('replaces hourly excess with the configured 12-hour and full-day tiers', () => {
    const input = {
      basePricePerDay: 1000,
      excessRatePerHour: 300,
      autoFullDayAfterHours: 18,
      twelveHourRate: 1200,
    }

    expect(calculateOverdueCharge({ ...input, overdueHours: 3 }).amount).toBe(900)
    expect(calculateOverdueCharge({ ...input, overdueHours: 12 }).amount).toBe(1200)
    expect(calculateOverdueCharge({ ...input, overdueHours: 18 }).amount).toBe(1000)
    expect(calculateOverdueCharge({ ...input, overdueHours: 24 }).amount).toBe(2800)
    expect(calculateOverdueCharge({ ...input, overdueHours: 36 }).amount).toBe(2000)
  })
})
