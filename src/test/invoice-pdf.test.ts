import { describe, expect, it, vi } from 'vitest'
import type { BookingInvoiceData } from '@/services/booking-service'
import { buildInvoiceHtml, buildInvoicePlaintext, downloadBookingInvoicePdf } from '@/lib/invoice-pdf'

const mocks = vi.hoisted(() => ({
  getBookingInvoiceData: vi.fn(),
  from: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@/services/booking-service', () => ({
  getBookingInvoiceData: mocks.getBookingInvoiceData,
}))

vi.mock('html2pdf.js', () => ({
  default: () => {
    const worker = {
      set: vi.fn(() => worker),
      from: mocks.from.mockImplementation(() => worker),
      save: mocks.save.mockResolvedValue(undefined),
    }
    return worker
  },
}))

const invoiceData: BookingInvoiceData = {
  booking: {
    id: 'booking-1',
    booking_number: 'CR-20260723-TUPCU',
    customer_id: 'customer-1',
    guest_name: null,
    guest_email: null,
    guest_mobile: null,
    vehicle_id: 'vehicle-1',
    rental_model: 'self_drive',
    status: 'confirmed',
    start_at: '2026-07-23T03:50:00Z',
    end_at: '2026-07-30T09:30:00Z',
    duration_days: 7,
    pickup_location: 'Villamor',
    dropoff_location: 'Villamor',
    destination: 'Tagaytay',
    purpose_of_travel: 'Family trip',
    notes: null,
    self_drive_address: null,
    distance_km: null,
    duration_minutes: null,
    toll_estimate_amount: 0,
    toll_segments: [],
    fuel_estimate_liters: 0,
    fuel_estimate_amount: 0,
    delivery_fee: 0,
    recovery_fee: 0,
    discount_amount: 0,
    deposit_amount: 0,
    subtotal_amount: 36400,
    total_amount: 36400,
    paid_amount: 0,
    remaining_amount: 36400,
    price_line_items: [
      { label: 'Base Rental - 7 days', detail: '', amount: 36400 },
      { label: 'Vehicle Extra (6h)', detail: '', amount: 0 },
    ],
    idempotency_key: null,
    created_by: null,
    created_at: '2026-07-23T15:18:00Z',
    updated_at: '2026-07-31T15:18:00Z',
  },
  customer: {
    first_name: 'Charles Nathaniel',
    last_name: 'Togle',
    email: 'charles@example.com',
    mobile: '09281995178',
    address: 'Villamor',
    city: 'Pasay City',
    province: 'Metro Manila',
    zip_code: '1300',
    country: 'Philippines',
  },
  vehicle: {
    name: 'Commuter Deluxe',
    year: 2023,
  },
  payments: [],
  business: {
    business_name: 'Katada Transportation Services',
    support_email: 'tadsuu@gmail.com',
    support_phone: '+63 906 496 1248',
    business_address: '11th 12th St., Villamor',
    city: 'Pasay City',
    province: 'Metro Manila',
    vat_percent: 0,
  },
}

describe('invoice pdf', () => {
  it('builds compact invoice html and plaintext with booking details', () => {
    const html = buildInvoiceHtml(invoiceData)
    const plainText = buildInvoicePlaintext(invoiceData)

    expect(html).toContain('invoice-page')
    expect(html).toContain('border: 0 !important;')
    expect(html).toContain('src="/apple-touch-icon.png"')
    expect(html).toContain('Not an official receipt')
    expect(html).toContain('Pick-Up · Drop-Off')
    expect(html).toContain('→<br>')
    expect(html).toContain('Amount Due')
    expect(plainText).toContain('I N V O I C E')
    expect(plainText).toContain('Charles Nathaniel Togle')
    expect(plainText).toContain('Toyota · 2023')
    expect(plainText).toContain('Jul 23, 2026 11:50 → Jul 30, 2026 17:30')
    expect(plainText).toContain('₱36,400.00')
    expect(plainText).toContain('No payments recorded')
  })

  it('uses a stored zero remaining balance without recomputing it', () => {
    const html = buildInvoiceHtml({
      ...invoiceData,
      booking: { ...invoiceData.booking, total_amount: 100, remaining_amount: 0 },
      payments: [],
    })

    expect(html).toContain('<strong>₱0.00</strong>')
  })

  it('captures invoice content inside the viewport', async () => {
    mocks.getBookingInvoiceData.mockResolvedValue(invoiceData)

    await downloadBookingInvoicePdf('booking-1')

    const source = mocks.from.mock.calls[0]?.[0] as HTMLElement
    expect(source.textContent).toContain('Charles Nathaniel Togle')
    expect(source.classList.contains('invoice-page')).toBe(true)
    expect(source.closest('div')?.style.left).toBe('0px')
    expect(source.closest('div')?.style.opacity).toBe('')
  })
})
