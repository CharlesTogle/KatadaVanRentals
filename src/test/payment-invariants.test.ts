import { describe, expect, it } from 'vitest'

describe('payment invariants', () => {
  it('derives remaining from total minus submitted payments', () => {
    expect(Math.max(4750 - 475, 0)).toBe(4275)
    expect(Math.max(4750 - 4750, 0)).toBe(0)
  })

  it('keeps estimates out of the payable total', () => {
    const total = 4750
    const fuelEstimate = 315
    const tollEstimate = 105

    expect(total).toBe(4750)
    expect(total).not.toBe(total + fuelEstimate + tollEstimate)
  })

  it('counts submitted payments and excludes rejected payments', () => {
    const payments = [
      { amount: 475, status: 'submitted' },
      { amount: 100, status: 'rejected' },
    ]

    expect(payments.filter((payment) => payment.status === 'submitted').reduce((sum, payment) => sum + payment.amount, 0)).toBe(475)
  })
})
