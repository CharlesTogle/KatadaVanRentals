import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminBookingByNumber, getBookingById, runAdminBookingAction } from '@/services/booking-service'

const mocks = vi.hoisted(() => {
  const bookingsSingle = vi.fn()
  const bookingsEq = vi.fn(() => ({ single: bookingsSingle }))
  const bookingsSelect = vi.fn(() => ({ eq: bookingsEq }))

  const paymentsOrder = vi.fn()
  const paymentsEq = vi.fn(() => ({ order: paymentsOrder }))
  const paymentsSelect = vi.fn(() => ({ eq: paymentsEq }))

  const customerDocumentsOrder = vi.fn()
  const customerDocumentsEq = vi.fn(() => ({ order: customerDocumentsOrder }))
  const customerDocumentsSelect = vi.fn(() => ({ eq: customerDocumentsEq }))

  const statusEventsOrder = vi.fn()
  const statusEventsEq = vi.fn(() => ({ order: statusEventsOrder }))
  const statusEventsSelect = vi.fn(() => ({ eq: statusEventsEq }))

  const extensionsOrder = vi.fn()
  const extensionsEq = vi.fn(() => ({ order: extensionsOrder }))
  const extensionsSelect = vi.fn(() => ({ eq: extensionsEq }))

  const bookingCancellationsMaybeSingle = vi.fn()
  const bookingCancellationsOrder = vi.fn(() => ({ maybeSingle: bookingCancellationsMaybeSingle }))
  const bookingCancellationsEq = vi.fn(() => ({ order: bookingCancellationsOrder }))
  const bookingCancellationsSelect = vi.fn(() => ({ eq: bookingCancellationsEq }))

  const invoicesMaybeSingle = vi.fn()
  const invoicesOrder = vi.fn(() => ({ maybeSingle: invoicesMaybeSingle }))
  const invoicesEq = vi.fn(() => ({ order: invoicesOrder }))
  const invoicesSelect = vi.fn(() => ({ eq: invoicesEq }))

  const from = vi.fn((table: string) => {
    if (table === 'bookings') return { select: bookingsSelect }
    if (table === 'payments') return { select: paymentsSelect }
    if (table === 'customer_documents') return { select: customerDocumentsSelect }
    if (table === 'booking_status_events') return { select: statusEventsSelect }
    if (table === 'booking_extensions') return { select: extensionsSelect }
    if (table === 'invoices') return { select: invoicesSelect }
    if (table === 'booking_cancellations') return { select: bookingCancellationsSelect }

    throw new Error(`Unexpected table: ${table}`)
  })

  const rpc = vi.fn()

  return {
    bookingsSingle,
    bookingsEq,
    bookingsSelect,
    paymentsOrder,
    paymentsEq,
    paymentsSelect,
    customerDocumentsOrder,
    customerDocumentsEq,
    customerDocumentsSelect,
    statusEventsOrder,
    statusEventsEq,
    statusEventsSelect,
    extensionsOrder,
    extensionsEq,
    extensionsSelect,
    bookingCancellationsMaybeSingle,
    bookingCancellationsOrder,
    bookingCancellationsEq,
    bookingCancellationsSelect,
    invoicesMaybeSingle,
    invoicesOrder,
    invoicesEq,
    invoicesSelect,
    from,
    rpc,
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}))

describe('booking-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.paymentsOrder.mockResolvedValue({ data: [], error: null })
    mocks.customerDocumentsOrder.mockResolvedValue({ data: [], error: null })
    mocks.statusEventsOrder.mockResolvedValue({ data: [], error: null })
    mocks.extensionsOrder.mockResolvedValue({ data: [], error: null })
    mocks.invoicesMaybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.bookingCancellationsMaybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.rpc.mockResolvedValue({ error: null })
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

  it('loads customer booking details with the extra read-only sections', async () => {
    mocks.bookingsSingle.mockResolvedValue({
      data: {
        id: 'booking-1',
        booking_number: 'CR-260723-F84D',
        customer_id: 'customer-1',
        created_by: 'customer-1',
        vehicle_id: 'vehicle-1',
        rental_model: 'all_out',
        status: 'confirmed',
        start_at: '2026-07-23T00:00:00.000Z',
        end_at: '2026-07-24T00:00:00.000Z',
        duration_days: 1,
        pickup_location: 'Manila',
        dropoff_location: 'Taguig City',
        destination: 'Taguig City',
        purpose_of_travel: 'Client Visit',
        notes: null,
        discount_amount: 0,
        deposit_amount: 250,
        total_amount: 2250,
        paid_amount: 250,
        remaining_amount: 2000,
        price_line_items: [],
        guest_name: null,
        guest_email: null,
        guest_mobile: null,
        created_at: '2026-07-23T12:18:00.000Z',
        updated_at: '2026-07-23T12:18:00.000Z',
        vehicles: {
          id: 'vehicle-1',
          name: 'Test Vehicle',
          plate_number: 'ABC1234',
          image_paths: [],
        },
      },
      error: null,
    })
    mocks.paymentsOrder.mockResolvedValue({ data: [{ id: 'payment-1', amount: 250, channel: 'bank_transfer', status: 'verified', reference_number: 'REF-1', receipt_path: 'booking-1/receipt.png', paid_at: null, created_at: '2026-07-23T12:18:00.000Z' }], error: null })
    mocks.statusEventsOrder.mockResolvedValue({ data: [{ id: 'event-1', from_status: 'for_review', to_status: 'confirmed', note: 'Approved', created_at: '2026-07-23T12:20:00.000Z' }], error: null })
    mocks.extensionsOrder.mockResolvedValue({ data: [{ id: 'extension-1', previous_end_at: '2026-07-24T00:00:00.000Z', new_end_at: '2026-07-25T00:00:00.000Z', extension_amount: 1000, reason: 'Extra day', created_at: '2026-07-24T12:18:00.000Z' }], error: null })
    mocks.invoicesMaybeSingle.mockResolvedValue({ data: { id: 'invoice-1', invoice_number: 'INV-1', status: 'issued', total_amount: 2250, file_path: null, issued_at: '2026-07-23T12:18:00.000Z' }, error: null })

    const result = await getBookingById('booking-1')

    expect(mocks.bookingsSelect).toHaveBeenCalledWith('*, vehicles!vehicle_id(id,name,plate_number,image_paths)')
    expect(result.vehicle?.name).toBe('Test Vehicle')
    expect(result.payments).toHaveLength(1)
    expect(result.status_events).toHaveLength(1)
    expect(result.extensions).toHaveLength(1)
    expect(result.invoice?.invoice_number).toBe('INV-1')
  })

  it('returns the latest booking cancellation alongside the status events', async () => {
    mocks.bookingsSingle.mockResolvedValue({
      data: {
        id: 'booking-1',
        booking_number: 'CR-260723-F84D',
        customer_id: 'customer-1',
        created_by: 'customer-1',
        vehicle_id: 'vehicle-1',
        rental_model: 'all_out',
        status: 'canceled',
        start_at: '2026-07-23T00:00:00.000Z',
        end_at: '2026-07-24T00:00:00.000Z',
        duration_days: 1,
        pickup_location: 'Manila',
        dropoff_location: 'Taguig City',
        destination: 'Taguig City',
        purpose_of_travel: 'Client Visit',
        notes: null,
        discount_amount: 0,
        deposit_amount: 250,
        total_amount: 2250,
        paid_amount: 250,
        remaining_amount: 2000,
        price_line_items: [],
        guest_name: null,
        guest_email: null,
        guest_mobile: null,
        created_at: '2026-07-23T12:18:00.000Z',
        updated_at: '2026-07-23T12:18:00.000Z',
        vehicles: {
          id: 'vehicle-1',
          name: 'Test Vehicle',
          plate_number: 'ABC1234',
          image_paths: [],
        },
      },
      error: null,
    })
    mocks.statusEventsOrder.mockResolvedValue({ data: [{ id: 'event-1', from_status: 'confirmed', to_status: 'canceled', note: null, created_at: '2026-07-23T12:20:00.000Z' }], error: null })
    mocks.bookingCancellationsMaybeSingle.mockResolvedValue({ data: { cancellation_type: 'customer_request', reason: 'Need to move the trip', created_at: '2026-07-23T12:20:00.000Z' }, error: null })

    const result = await getBookingById('booking-1')

    expect(result.status_events[0]?.note).toBeNull()
    expect(result.cancellation).toEqual({
      cancellation_type: 'customer_request',
      reason: 'Need to move the trip',
      created_at: '2026-07-23T12:20:00.000Z',
    })
  })

  it('passes final payment fields when completing a booking', async () => {
    await runAdminBookingAction({
      type: 'complete',
      bookingId: 'booking-1',
      collectedAmount: 3500,
      paymentMethodId: 'pm-1',
      paymentChannel: 'bank_transfer',
      referenceNumber: 'RET-789',
      receiptPath: 'booking-1/receipt.pdf',
      actualTollAmount: 700,
      actualFuelAmount: 1500,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('admin_complete_booking', {
      target_booking_id: 'booking-1',
      collected_amount: 3500,
      payment_method_id: 'pm-1',
      payment_channel: 'bank_transfer',
      reference_number: 'RET-789',
      receipt_path: 'booking-1/receipt.pdf',
      actual_toll_amount: 700,
      actual_fuel_amount: 1500,
      note: null,
    })
  })

  it('passes payment fields when recording a payment after completion', async () => {
    await runAdminBookingAction({
      type: 'make_payment',
      bookingId: 'booking-1',
      collectedAmount: 1500,
      paymentMethodId: 'pm-1',
      paymentChannel: 'bank_transfer',
      referenceNumber: 'BAL-123',
      receiptPath: 'booking-1/balance.pdf',
    })

    expect(mocks.rpc).toHaveBeenCalledWith('admin_record_completed_booking_payment', {
      target_booking_id: 'booking-1',
      collected_amount: 1500,
      payment_method_id: 'pm-1',
      payment_channel: 'bank_transfer',
      reference_number: 'BAL-123',
      receipt_path: 'booking-1/balance.pdf',
    })
  })
})
