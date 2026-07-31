import { describe, expect, it } from 'vitest'
import { buildInvoicePdf, buildInvoicePlaintext } from '@/lib/invoice-pdf'

describe('invoice pdf', () => {
  it('builds a pdf blob with invoice details', async () => {
    const blob = buildInvoicePdf({
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
    })

    const pdfText = await blob.text()
    const plainText = buildInvoicePlaintext({
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
        email: 'charles3939togle@gmail.com',
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
    })

    expect(pdfText).toContain('%PDF-1.4')
    expect(plainText).toContain('I N V O I C E')
    expect(plainText).toContain('Charles Nathaniel Togle')
    expect(plainText).toContain('Toyota · 2023')
    expect(plainText).toContain('Jul 23, 2026 11:50 → Jul 30, 2026 17:30')
    expect(plainText).toContain('₱36,400.00')
    expect(plainText).toContain('No payments recorded')
  })
})
