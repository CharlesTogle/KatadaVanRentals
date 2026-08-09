import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BookingDetail from '@/pages/admin/booking-detail'
import { getAdminBookingDetailActions } from '@/lib/booking-utils'

const useAdminBooking = vi.fn()
const mutateAsync = vi.fn()
const upload = vi.fn()
const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/receipt.pdf' }, error: null })
const useAppSettingsMock = vi.fn(() => ({ data: { booking_expiry_hours: 2 } }))

vi.mock('@/hooks/use-bookings', () => ({
  useAdminBooking: (...args: unknown[]) => useAdminBooking(...args),
  useAdminBookingAction: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('@/hooks/use-app-settings', () => ({
  useAppSettings: () => useAppSettingsMock(),
}))

vi.mock('@/hooks/use-payment-methods', () => ({
  usePaymentMethods: () => ({
    data: [{ id: 'pm-1', provider: 'BDO', channel: 'bank_transfer' }],
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => upload(...args),
        createSignedUrl,
      }),
    },
  },
}))

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockBooking = {
  id: 'booking-1',
  booking_number: 'CR-260723-ABCD',
  status: 'confirmed',
  rental_model: 'all_in',
  booking_mode: 'keep',
  start_at: '2026-07-25T08:00:00Z',
  end_at: '2026-07-27T08:00:00Z',
  duration_days: 2,
  total_amount: 9000,
  paid_amount: 2000,
  remaining_amount: 7000,
  pickup_location: 'Manila',
  dropoff_location: 'Batangas',
  destination: 'Taal',
  purpose_of_travel: 'Leisure',
  notes: null,
  discount_amount: 0,
  price_line_items: [
    { label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 },
  ],
  toll_estimate_amount: 600,
  fuel_estimate_amount: 1400,
  actual_toll_amount: 0,
  actual_fuel_amount: 0,
  customer_id: 'cust-1',
  vehicle_id: 'veh-1',
  created_at: '2026-07-23T10:00:00Z',
  updated_at: '2026-07-23T10:00:00Z',
}

const mockCustomer = { id: 'cust-1', first_name: 'Alex', last_name: 'Santos', email: 'alex@example.com', mobile: '09171234567' }
const mockVehicle = { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] }

function renderDetail(bookingNumber = 'CR-260723-ABCD') {
  return render(
    <MemoryRouter initialEntries={[`/admin/bookings/${bookingNumber}`]}>
      <Routes>
        <Route path="/admin/bookings/:bookingNumber" element={<BookingDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminBookingDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsync.mockResolvedValue(undefined)
    upload.mockReset()
    upload.mockResolvedValue({ error: null })
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/receipt.pdf' }, error: null })
  })

  it('renders loading state then booking number without changing hook order', async () => {
    useAdminBooking.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container, rerender } = render(
      <MemoryRouter initialEntries={[`/admin/bookings/CR-260723-ABCD`]}>
        <Routes>
          <Route path="/admin/bookings/:bookingNumber" element={<BookingDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()

    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    rerender(
      <MemoryRouter initialEntries={[`/admin/bookings/CR-260723-ABCD`]}>
        <Routes>
          <Route path="/admin/bookings/:bookingNumber" element={<BookingDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('CR-260723-ABCD').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('Jul 23, 2026, 6:00 PM')).toBeInTheDocument()
    expect(consoleError.mock.calls.some((call) => call.some((value) => String(value).includes('Rendered more hooks than during the previous render')))).toBe(false)
    consoleError.mockRestore()
  })

  it('does not show the complete address block as customer note', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, rental_model: 'self_drive', notes: 'Complete Address: Unit 3A, Blue Residences, Taft Avenue' },
        customer: mockCustomer,
        vehicle: mockVehicle,
        payments: [],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    expect(screen.queryByText('Customer Note')).not.toBeInTheDocument()
    expect(screen.queryByText(/Complete Address:/)).not.toBeInTheDocument()
  })

  it('renders not-found when data is null', () => {
    useAdminBooking.mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') })

    renderDetail()

    expect(screen.getByText(/booking not found/i)).toBeInTheDocument()
  })

  it('displays booking header and status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getAllByText('CR-260723-ABCD').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('confirmed').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Toyota Commuter/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Alex Santos/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows distance instead of duration for with-driver dropoff bookings', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, rental_model: 'all_out', booking_mode: 'dropoff', distance_km: 42, duration_days: 2 },
        customer: mockCustomer,
        vehicle: mockVehicle,
        payments: [],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Distance')).toBeInTheDocument()
      expect(screen.getByText('42 km')).toBeInTheDocument()
      expect(screen.queryByText('Duration')).not.toBeInTheDocument()
    })
  })

  it('shows all-in fuel and toll estimates as estimate-only rows in price breakdown', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Fuel Estimate')).toBeInTheDocument()
      expect(screen.getByText('Toll Estimate')).toBeInTheDocument()
      expect(screen.getAllByText('estimate only - settled after trip').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders customer details', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('alex@example.com')).toBeInTheDocument()
      expect(screen.getByText('09171234567')).toBeInTheDocument()
    })
  })

  it('falls back to created-by profile data and keeps destination and purpose visible', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, customer_id: null, created_by: 'staff-1' },
        customer: { ...mockCustomer, id: 'staff-1' },
        vehicle: mockVehicle,
        payments: [],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getAllByText(/Alex Santos/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Taal')).toBeInTheDocument()
      expect(screen.getByText('Leisure')).toBeInTheDocument()
    })
  })

  it('renders placeholders in action modals', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Release Unit / Start Trip' }))

    expect(screen.getByPlaceholderText('Enter the amount collected')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Reference number or official receipt')).toBeInTheDocument()
  })

  it('renders no-documents message when empty', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText(/no documents on file/i)).toBeInTheDocument()
    })
  })

  it('shows correct actions for for_review status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Confirm with Adjustment' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Request Documents' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Booking' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Release Unit / Start Trip' })).not.toBeInTheDocument()
    })
  })

  it('renders price adjustment rows in the admin price breakdown', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: {
          ...mockBooking,
          status: 'pending_price_approval',
          deposit_amount: 900,
          total_amount: 10000,
          remaining_amount: 8000,
        },
        customer: mockCustomer,
        vehicle: mockVehicle,
         payments: [{ id: 'payment-1', channel: 'bank_transfer', status: 'submitted', amount: 1100, reference_number: 'REF-1', receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [{ id: 'event-adjusted', from_status: null, to_status: 'pending_price_approval', note: 'Price adjusted to 10000. Reason: Out-of-city surcharge', created_at: '2026-07-23T10:30:00Z' }],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    expect(screen.getByText('Price Adjustment')).toBeInTheDocument()
    expect(screen.getByText('Payment Made')).toBeInTheDocument()
    expect(screen.getByText('Remaining Balance')).toBeInTheDocument()
  })

  it('adds unpaid extension charges to the admin balance summary', () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: {
          ...mockBooking,
          status: 'on_trip',
          deposit_amount: 900,
          total_amount: 11500,
          remaining_amount: 9500,
        },
        customer: mockCustomer,
        vehicle: mockVehicle,
         payments: [{ id: 'payment-1', channel: 'bank_transfer', status: 'submitted', amount: 1100, reference_number: 'REF-1', receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [{ id: 'event-adjusted', from_status: null, to_status: 'on_trip', note: 'Price adjusted to 10000. Reason: Out-of-city surcharge', created_at: '2026-07-23T10:30:00Z' }],
        extensions: [{ id: 'extension-1', previous_end_at: '2026-07-27T08:00:00Z', new_end_at: '2026-07-28T08:00:00Z', extension_amount: 1500, payment_id: null, reason: 'Customer requested an extra day', created_at: '2026-07-26T09:00:00Z' }],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    expect(screen.getByText('Price Adjustment')).toBeInTheDocument()
    expect(screen.getByText('Extension Charge (1 day)')).toBeInTheDocument()
    expect(screen.getByText('Payment Made')).toBeInTheDocument()
    expect(screen.getAllByText('+₱1,500.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₱11,500.00').length).toBeGreaterThan(0)
  })

  it('shows the reconstructed total when adjustments and extensions outpace the stored booking total', () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: {
          ...mockBooking,
          status: 'on_trip',
          total_amount: 23000,
          remaining_amount: 23700,
          deposit_amount: 2300,
          price_line_items: [{ label: 'Base', detail: '23.00d × ₱1000.00', amount: 23000 }],
        },
        customer: mockCustomer,
        vehicle: mockVehicle,
        payments: [{ id: 'payment-1', channel: 'bank_transfer', status: 'submitted', amount: 2300, reference_number: 'REF-1', receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [{ id: 'event-adjusted', from_status: null, to_status: 'on_trip', note: 'Price adjusted to 26000. Reason: Extra fees', created_at: '2026-07-23T10:30:00Z' }],
        extensions: [{ id: 'extension-1', previous_end_at: '2026-07-27T08:00:00Z', new_end_at: '2026-08-05T08:00:00Z', extension_amount: 16500, payment_id: null, reason: 'Longer trip', created_at: '2026-07-26T09:00:00Z' }],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    expect(screen.getAllByText('₱23,000.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Price Adjustment')).toBeInTheDocument()
    expect(screen.getByText('Extension Charge (9 days)')).toBeInTheDocument()
    expect(screen.getByText('Payment Made')).toBeInTheDocument()
    expect(screen.getByText('₱23,700.00')).toBeInTheDocument()
  })

  it('confirms a for review booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirm' })[1])

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'confirm', bookingId: 'booking-1' })
    })
  })

  it('rejects a for review booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    fireEvent.change(screen.getByPlaceholderText('Tell the customer why the booking is being rejected'), { target: { value: 'Missing verification' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[1])

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'reject', bookingId: 'booking-1', reason: 'Missing verification' })
    })
  })

  it('adjusts a for review booking upward from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm with Adjustment' }))

    expect(screen.getByText('Customer must approve the addition within the deadline before booking confirms.')).toBeInTheDocument()
    expect(screen.getAllByText('₱7,000.00').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '500' } })
    expect(screen.getAllByText('₱7,500.00').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText('e.g. Location surcharge for out-of-city delivery...'), { target: { value: 'Location surcharge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Adjustment' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'adjust_price', bookingId: 'booking-1', adjustedTotal: 9500, reason: 'Location surcharge' })
    })
  })

  it('adjusts a for review booking downward from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm with Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: '-' }))

    expect(screen.getByText('Discount - booking will be automatically confirmed immediately.')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1000' } })
    expect(screen.getAllByText('₱6,000.00').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText('e.g. Location surcharge for out-of-city delivery...'), { target: { value: 'Discount approved' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Adjustment' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'adjust_price', bookingId: 'booking-1', adjustedTotal: 8000, reason: 'Discount approved' })
    })
  })

  it('shows inline validation in the adjust booking modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm with Adjustment' }))

    expect(screen.getByText('Enter an adjustment amount.')).toBeInTheDocument()
    expect(screen.getByText('Reason for adjustment is required.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '-' }))
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '8000' } })

    expect(screen.getByText('New remaining balance cannot be below 0.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Adjustment' })).toBeDisabled()
  })

  it('blocks absurd adjustment amounts in the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm with Adjustment' }))
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '999999' } })

    expect(screen.getByText('Adjustment amount cannot exceed ₱99,999.99.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Adjustment' })).toBeDisabled()
  })

  it('shows correct actions for confirmed status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Release Unit / Start Trip' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Extend Rental' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel Booking' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    })
  })

  it('starts a confirmed trip from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Release Unit / Start Trip' }))
    fireEvent.change(screen.getByPlaceholderText('Enter the amount collected'), { target: { value: '7000' } })
    fireEvent.change(screen.getByDisplayValue('BDO'), { target: { value: 'pm-1' } })
    fireEvent.change(screen.getByDisplayValue('Cash'), { target: { value: 'bank_transfer' } })
    fireEvent.change(screen.getByPlaceholderText('Reference number or official receipt'), { target: { value: 'REF-123' } })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Start Trip' }))

    await waitFor(() => {
      expect(upload).toHaveBeenCalled()
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'start_trip', bookingId: 'booking-1', collectedAmount: 7000, paymentMethodId: 'pm-1', paymentChannel: 'bank_transfer', referenceNumber: 'REF-123', receiptPath: expect.stringMatching(/^booking-1\/\d+\.pdf$/) })
    })
  })

  it('rejects an unsupported receipt before the start-trip action', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [], documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Release Unit / Start Trip' }))
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['receipt'], 'receipt.gif', { type: 'image/gif' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Start Trip' }))

    await waitFor(() => {
      expect(upload).not.toHaveBeenCalled()
      expect(mutateAsync).not.toHaveBeenCalled()
    })
    upload.mockResolvedValue({ error: null })
  })

  it('extends an on trip booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Extend Rental' }))
    fireEvent.change(screen.getByLabelText('New Return Date'), { target: { value: '2026-07-30T08:00' } })
    fireEvent.change(screen.getByPlaceholderText('Enter the extension charge'), { target: { value: '1500' } })
    fireEvent.change(screen.getByPlaceholderText('Optional note for the extension'), { target: { value: 'Customer requested two extra days' } })
    fireEvent.click(screen.getByLabelText('Collect payment now'))
    fireEvent.change(screen.getByDisplayValue('BDO'), { target: { value: 'pm-1' } })
    fireEvent.change(screen.getByDisplayValue('Cash'), { target: { value: 'bank_transfer' } })
    fireEvent.change(screen.getByPlaceholderText('Reference number or official receipt'), { target: { value: 'EXT-456' } })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['receipt'], 'extend.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Extend' }))

    await waitFor(() => {
      expect(upload).toHaveBeenCalled()
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'extend', bookingId: 'booking-1', newEndAt: '2026-07-30T08:00', extensionAmount: 1500, reason: 'Customer requested two extra days', collectNow: true, paymentMethodId: 'pm-1', paymentChannel: 'bank_transfer', referenceNumber: 'EXT-456', receiptPath: expect.stringMatching(/^booking-1\/\d+\.pdf$/) })
    })
  })

  it('requires the new return date to be after the current end date', () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Extend Rental' }))
    const dateInput = screen.getByLabelText('New Return Date') as HTMLInputElement

    expect(dateInput).toHaveValue('')

    fireEvent.change(dateInput, { target: { value: '2026-07-27T08:00' } })
    fireEvent.change(screen.getByPlaceholderText('Enter the extension charge'), { target: { value: '1500' } })

    expect(screen.getByRole('button', { name: 'Extend' })).toBeDisabled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('cancels a confirmed booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Booking' }))
    fireEvent.click(screen.getByLabelText('Admin - no refund'))
    fireEvent.change(screen.getByPlaceholderText('Reason for cancellation...'), { target: { value: 'Customer did not show up' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Cancel' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'cancel', bookingId: 'booking-1', cancellationType: 'admin_no_refund', reason: 'Customer did not show up' })
    })
  })

  it('deletes a booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'completed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Booking' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Forever' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'delete', bookingId: 'booking-1' })
    })
  })

  it('shows make a payment for completed bookings with remaining balance', async () => {
    useAdminBooking.mockReturnValue({
      data: {
          booking: { ...mockBooking, status: 'completed', remaining_amount: 1500 },
        customer: mockCustomer,
        vehicle: mockVehicle,
          payments: [{ id: 'payment-1', channel: 'cash', status: 'submitted', amount: 7500, reference_number: null, receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Make a Payment' })).toBeInTheDocument()
    })
  })

  it('hides make a payment for completed bookings with zero remaining balance', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, status: 'completed', remaining_amount: 0 },
        customer: mockCustomer,
        vehicle: mockVehicle,
          payments: [{ id: 'payment-1', channel: 'cash', status: 'submitted', amount: 9000, reference_number: null, receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Make a Payment' })).not.toBeInTheDocument()
    })
  })

  it('hides make a payment when the canonical remaining balance is zero', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, status: 'completed', remaining_amount: 0 },
        customer: mockCustomer,
        vehicle: mockVehicle,
          payments: [{ id: 'payment-1', channel: 'cash', status: 'submitted', amount: 9000, reference_number: null, receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('₱0.00')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Make a Payment' })).not.toBeInTheDocument()
    })
  })

  it('records a payment for a completed booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, status: 'completed', remaining_amount: 1500 },
        customer: mockCustomer,
        vehicle: mockVehicle,
          payments: [{ id: 'payment-1', channel: 'cash', status: 'submitted', amount: 7500, reference_number: null, receipt_path: null, paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Make a Payment' }))
    fireEvent.change(screen.getByPlaceholderText('Enter the amount collected'), { target: { value: '1500' } })
    fireEvent.change(screen.getByDisplayValue('BDO'), { target: { value: 'pm-1' } })
    fireEvent.change(screen.getByDisplayValue('Cash'), { target: { value: 'bank_transfer' } })
    fireEvent.change(screen.getByPlaceholderText('Reference number or official receipt'), { target: { value: 'BAL-123' } })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['receipt'], 'balance.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Record Payment' }))

    await waitFor(() => {
      expect(upload).toHaveBeenCalled()
       expect(mutateAsync).toHaveBeenCalledWith({ type: 'make_payment', bookingId: 'booking-1', collectedAmount: 1500, paymentMethodId: 'pm-1', paymentChannel: 'bank_transfer', referenceNumber: 'BAL-123', receiptPath: expect.stringMatching(/^booking-1\/\d+\.pdf$/), idempotencyKey: expect.any(String) })
    })
  })

  it('shows correct actions for on_trip status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark as Returned' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Extend Rental' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Release Unit / Start Trip' })).not.toBeInTheDocument()
    })
  })

  it('completes an on trip booking from the modal with a final payment', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Returned' }))
    fireEvent.change(screen.getByPlaceholderText('Enter the actual toll'), { target: { value: '700' } })
    fireEvent.change(screen.getByPlaceholderText('Enter the actual gas'), { target: { value: '1500' } })
    fireEvent.change(screen.getByPlaceholderText('Enter the amount collected'), { target: { value: '3500' } })
    fireEvent.change(screen.getByDisplayValue('BDO'), { target: { value: 'pm-1' } })
    fireEvent.change(screen.getByDisplayValue('Cash'), { target: { value: 'bank_transfer' } })
    fireEvent.change(screen.getByPlaceholderText('Reference number or official receipt'), { target: { value: 'RET-789' } })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['receipt'], 'return.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))

    await waitFor(() => {
      expect(upload).toHaveBeenCalled()
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'complete', bookingId: 'booking-1', collectedAmount: 3500, paymentMethodId: 'pm-1', paymentChannel: 'bank_transfer', referenceNumber: 'RET-789', receiptPath: expect.stringMatching(/^booking-1\/\d+\.pdf$/), actualTollAmount: 700, actualFuelAmount: 1500 })
    })
  })

  it('requires actual toll and gas to complete an all-in keep trip', () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Returned' }))

    expect(screen.getByText('Trip Reconciliation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled()
  })

  it('requires actual toll and gas for all-in trips even when not keep-the-car', () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip', booking_mode: 'dropoff' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], requested_document_types: [],
        documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Returned' }))

    expect(screen.getByText('Trip Reconciliation')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter the actual toll')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter the actual gas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled()
  })

  it('formats canceled booking notes into plain language', async () => {
    useAdminBooking.mockReturnValue({
      data: {
        booking: { ...mockBooking, status: 'canceled' },
        customer: mockCustomer,
        vehicle: mockVehicle,
        cancellation: { cancellation_type: 'customer_request', reason: 'Cinancel eh', created_at: '2026-07-23T10:00:00Z' },
        payments: [],
        requested_document_types: [],
        documents: [],
        status_events: [{ id: 'event-1', from_status: 'confirmed', to_status: 'canceled', note: null, created_at: '2026-07-23T10:00:00Z' }],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText("Canceled at the customer's request. Reason: Cinancel eh")).toBeInTheDocument()
    })
  })

  it('shows payment receipts inline when the stored path includes the bucket prefix', async () => {
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)

    createSignedUrl.mockImplementation(async (path: string) => {
      if (path === 'booking-1/receipt.png') {
        return { data: { signedUrl: 'https://example.com/receipt.png' }, error: null }
      }

      return { data: null, error: new Error('not found') }
    })

    useAdminBooking.mockReturnValue({
      data: {
        booking: mockBooking,
        customer: mockCustomer,
        vehicle: mockVehicle,
        payments: [{
          id: 'payment-1',
          channel: 'bank_transfer',
          status: 'submitted',
          amount: 2000,
          reference_number: 'REF-123',
          receipt_path: 'payment-receipts/booking-1/receipt.png',
          paid_at: null,
          created_at: '2026-07-23T10:00:00Z',
        }],
        requested_document_types: [],
        documents: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(await screen.findByRole('link', { name: /view receipt/i }))

    await waitFor(() => {
      expect(createSignedUrl).toHaveBeenCalledWith('booking-1/receipt.png', 3600)
      expect(screen.getByAltText('Payment receipt')).toHaveAttribute('src', 'https://example.com/receipt.png')
    })

    expect(windowOpen).not.toHaveBeenCalled()

    windowOpen.mockRestore()
  })

  it('getAdminBookingDetailActions returns correct actions per status', () => {
    expect(getAdminBookingDetailActions('for_review').map(a => a.type)).toEqual(['confirm', 'reject', 'adjust_booking', 'request_documents', 'delete'])
    expect(getAdminBookingDetailActions('confirmed').map(a => a.type)).toEqual(['start_trip', 'extend_rental', 'cancel', 'delete'])
    expect(getAdminBookingDetailActions('on_trip').map(a => a.type)).toEqual(['complete', 'extend_rental'])
    expect(getAdminBookingDetailActions('completed').map(a => a.type)).toEqual(['delete'])
    expect(getAdminBookingDetailActions('canceled')).toEqual([])
  })
})
