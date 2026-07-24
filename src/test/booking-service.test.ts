import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminBookingByNumber } from '@/services/booking-service'

const mocks = vi.hoisted(() => {
  const bookingsSingle = vi.fn()
  const bookingsEq = vi.fn(() => ({ single: bookingsSingle }))
  const bookingsSelect = vi.fn(() => ({ eq: bookingsEq }))

  const paymentsOrder = vi.fn()
  const paymentsEq = vi.fn(() => ({ order: paymentsOrder }))
  const paymentsSelect = vi.fn(() => ({ eq: paymentsEq }))

  const bookingDocumentsEq = vi.fn()
  const bookingDocumentsSelect = vi.fn(() => ({ eq: bookingDocumentsEq }))

  const statusEventsOrder = vi.fn()
  const statusEventsEq = vi.fn(() => ({ order: statusEventsOrder }))
  const statusEventsSelect = vi.fn(() => ({ eq: statusEventsEq }))

  const extensionsOrder = vi.fn()
  const extensionsEq = vi.fn(() => ({ order: extensionsOrder }))
  const extensionsSelect = vi.fn(() => ({ eq: extensionsEq }))

  const invoicesMaybeSingle = vi.fn()
  const invoicesOrder = vi.fn(() => ({ maybeSingle: invoicesMaybeSingle }))
  const invoicesEq = vi.fn(() => ({ order: invoicesOrder }))
  const invoicesSelect = vi.fn(() => ({ eq: invoicesEq }))

  const from = vi.fn((table: string) => {
    if (table === 'bookings') return { select: bookingsSelect }
    if (table === 'payments') return { select: paymentsSelect }
    if (table === 'booking_documents') return { select: bookingDocumentsSelect }
    if (table === 'booking_status_events') return { select: statusEventsSelect }
    if (table === 'booking_extensions') return { select: extensionsSelect }
    if (table === 'invoices') return { select: invoicesSelect }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    bookingsSingle,
    bookingsEq,
    bookingsSelect,
    paymentsOrder,
    paymentsEq,
    paymentsSelect,
    bookingDocumentsEq,
    bookingDocumentsSelect,
    statusEventsOrder,
    statusEventsEq,
    statusEventsSelect,
    extensionsOrder,
    extensionsEq,
    extensionsSelect,
    invoicesMaybeSingle,
    invoicesOrder,
    invoicesEq,
    invoicesSelect,
    from,
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

describe('booking-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.paymentsOrder.mockResolvedValue({ data: [], error: null })
    mocks.bookingDocumentsEq.mockResolvedValue({ data: [], error: null })
    mocks.statusEventsOrder.mockResolvedValue({ data: [], error: null })
    mocks.extensionsOrder.mockResolvedValue({ data: [], error: null })
    mocks.invoicesMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('loads admin booking details with joined customer and vehicle data', async () => {
    mocks.bookingsSingle.mockResolvedValue({
      data: {
        id: 'booking-1',
        booking_number: 'CR-260723-F84D',
        customer_id: 'customer-1',
        created_by: 'customer-1',
        vehicle_id: 'vehicle-1',
        rental_model: 'all_out',
        status: 'for_review',
        start_at: '2026-07-23T00:00:00.000Z',
        end_at: '2026-07-24T00:00:00.000Z',
        duration_days: 1,
        pickup_location: 'Manila',
        dropoff_location: 'Taguig City',
        destination: 'Taguig City',
        purpose_of_travel: 'Client Visit',
        notes: null,
        discount_amount: 0,
        deposit_amount: 0,
        total_amount: 2250,
        paid_amount: 0,
        remaining_amount: 2250,
        price_line_items: [],
        guest_name: null,
        guest_email: null,
        guest_mobile: null,
        created_at: '2026-07-23T12:18:00.000Z',
        updated_at: '2026-07-23T12:18:00.000Z',
        profiles: {
          id: 'customer-1',
          first_name: 'Charles',
          last_name: 'Togle',
          email: 'charles3togle@gmail.com',
          mobile: '09123456789',
          address: 'Pasay',
          city: 'Pasay City',
          province: 'Metro Manila',
          zip_code: '1300',
          country: 'Philippines',
        },
        vehicles: {
          id: 'vehicle-1',
          name: 'Test Vehicle',
          plate_number: 'ABC1234',
          image_paths: [],
        },
      },
      error: null,
    })

    const result = await getAdminBookingByNumber('CR-260723-F84D')

    expect(mocks.bookingsSelect).toHaveBeenCalledWith('*, profiles!customer_id(id,first_name,last_name,email,mobile,address,city,province,zip_code,country), vehicles!vehicle_id(id,name,plate_number,image_paths)')
    expect(result.customer?.first_name).toBe('Charles')
    expect(result.customer?.email).toBe('charles3togle@gmail.com')
    expect(result.vehicle?.name).toBe('Test Vehicle')
    expect(result.booking.destination).toBe('Taguig City')
    expect(result.booking.purpose_of_travel).toBe('Client Visit')
  })
})
