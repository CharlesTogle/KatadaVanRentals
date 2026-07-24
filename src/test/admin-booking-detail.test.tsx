import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BookingDetail from '@/pages/admin/booking-detail'
import { getAdminBookingDetailActions } from '@/lib/booking-utils'

const useAdminBooking = vi.fn()
const mutateAsync = vi.fn()
const upload = vi.fn()
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://example.com/receipt.pdf' } }))

vi.mock('@/hooks/use-bookings', () => ({
  useAdminBooking: (...args: unknown[]) => useAdminBooking(...args),
  useAdminBookingAction: () => ({ mutateAsync, isPending: false }),
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
        getPublicUrl,
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
    upload.mockResolvedValue({ error: null })
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
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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

    expect(consoleError.mock.calls.some((call) => call.some((value) => String(value).includes('Rendered more hooks than during the previous render')))).toBe(false)
    consoleError.mockRestore()
  })

  it('renders not-found when data is null', () => {
    useAdminBooking.mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') })

    renderDetail()

    expect(screen.getByText(/booking not found/i)).toBeInTheDocument()
  })

  it('displays booking header and status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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

  it('renders customer details', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      data: { booking: mockBooking, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Adjust Booking' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Request Documents' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Booking' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Release Unit / Start Trip' })).not.toBeInTheDocument()
    })
  })

  it('confirms a for review booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      data: { booking: { ...mockBooking, status: 'for_review' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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

  it('shows correct actions for confirmed status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'start_trip', bookingId: 'booking-1', collectedAmount: 7000, paymentMethodId: 'pm-1', paymentChannel: 'bank_transfer', referenceNumber: 'REF-123', receiptPath: 'https://example.com/receipt.pdf' })
    })
  })

  it('extends an on trip booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
      isLoading: false,
      error: null,
    })

    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Extend Rental' }))
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2026-07-30' } })
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
      expect(mutateAsync).toHaveBeenCalledWith({ type: 'extend', bookingId: 'booking-1', newEndAt: '2026-07-30', extensionAmount: 1500, reason: 'Customer requested two extra days', collectNow: true, paymentMethodId: 'pm-1', paymentChannel: 'bank_transfer', referenceNumber: 'EXT-456', receiptPath: 'https://example.com/receipt.pdf' })
    })
  })

  it('cancels a confirmed booking from the modal', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'confirmed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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
      data: { booking: { ...mockBooking, status: 'completed' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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

  it('shows correct actions for on_trip status', async () => {
    useAdminBooking.mockReturnValue({
      data: { booking: { ...mockBooking, status: 'on_trip' }, customer: mockCustomer, vehicle: mockVehicle, payments: [], documents: [], status_events: [], extensions: [], invoice: null },
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

  it('getAdminBookingDetailActions returns correct actions per status', () => {
    expect(getAdminBookingDetailActions('for_review').map(a => a.type)).toEqual(['confirm', 'reject', 'adjust_booking', 'request_documents', 'delete'])
    expect(getAdminBookingDetailActions('confirmed').map(a => a.type)).toEqual(['start_trip', 'extend_rental', 'cancel', 'delete'])
    expect(getAdminBookingDetailActions('on_trip').map(a => a.type)).toEqual(['complete', 'extend_rental'])
    expect(getAdminBookingDetailActions('completed').map(a => a.type)).toEqual(['delete'])
    expect(getAdminBookingDetailActions('canceled')).toEqual([])
  })
})
