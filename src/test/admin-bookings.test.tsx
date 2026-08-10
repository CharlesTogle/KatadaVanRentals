import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminBookings from '@/pages/admin/bookings'

const useAdminBookings = vi.fn()
const deleteMutateAsync = vi.fn()

vi.mock('@/hooks/use-bookings', () => ({
  useAdminBookings: (...args: unknown[]) => useAdminBookings(...args),
  useDeleteBooking: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('AdminBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    useAdminBookings.mockReturnValue({
      data: { items: [
        {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          start_at: '2026-07-23T12:00:00Z',
          total_amount: 4500,
          status: 'for_review',
          profiles: { first_name: 'Alex', last_name: 'Customer', email: 'alex@example.com' },
          vehicles: { name: 'Toyota Commuter', plate_number: 'ABC123' },
        },
        {
          id: 'booking-2',
          booking_number: 'CR-260723-EFGH',
          start_at: '2026-07-24T12:00:00Z',
          total_amount: 3200,
          status: 'confirmed',
          profiles: { first_name: 'Bea', last_name: 'Customer', email: 'bea@example.com' },
          vehicles: { name: 'Toyota Hiace', plate_number: 'XYZ987' },
        },
        {
          id: 'booking-3',
          booking_number: 'CR-260723-IJKL',
          start_at: '2026-07-25T12:00:00Z',
          total_amount: 5100,
          status: 'awaiting_documents',
          profiles: { first_name: 'Carl', last_name: 'Customer', email: 'carl@example.com' },
          vehicles: { name: 'Nissan Urvan', plate_number: 'LMN456' },
        },
      ], total: 3 },
      isLoading: false,
    })
    deleteMutateAsync.mockResolvedValue(undefined)
  })

  it('opens confirmation and deletes a booking without navigating', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete booking CR-260723-ABCD' }))

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 'booking-1' })
    })
  })

  it('navigates to booking details when a row is clicked', () => {
    function LocationProbe() {
      return <output data-testid="location">{useLocation().pathname}</output>
    }

    render(
      <MemoryRouter>
        <AdminBookings />
        <LocationProbe />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Alex Customer'))

    expect(screen.getByTestId('location')).toHaveTextContent('/admin/bookings/CR-260723-ABCD')
  })

  it('renders create booking CTA linking to the create page', () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Create booking' })).toHaveAttribute('href', '/admin/bookings/create')
  })

  it('shows refund status and filters canceled bookings by refund status', () => {
    useAdminBookings.mockReturnValue({
      data: { items: [{
        id: 'booking-1',
        booking_number: 'CR-260723-ABCD',
        start_at: '2026-07-23T12:00:00Z',
        total_amount: 4500,
        status: 'canceled',
         cancellation: [{ cancellation_type: 'customer_request', refund_status: 'refund_cancelled' }],
        profiles: { first_name: 'Alex', last_name: 'Customer', email: 'alex@example.com' },
        vehicles: { name: 'Toyota Commuter', plate_number: 'ABC123' },
      }], total: 1 },
      isLoading: false,
    })

    render(<MemoryRouter><AdminBookings /></MemoryRouter>)

    expect(screen.getByText('Not eligible for refund')).toBeInTheDocument()
    const bookingRow = screen.getByRole('row', { name: /View booking CR-260723-ABCD/ })
    expect(bookingRow).not.toHaveTextContent('Refund Cancelled')
    expect(bookingRow).not.toHaveTextContent('canceled')
    fireEvent.click(screen.getByRole('button', { name: 'Refund Processed' }))
    expect(useAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ refundStatus: 'refund_processed', status: undefined }))
  })

  it('passes the selected sort and resets pagination when sorting changes', () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sorted by Created At (Descending)')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort bookings by' }), { target: { value: 'start_at' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort direction' }), { target: { value: 'asc' } })

    expect(screen.getByText('Sorted by Start Date (Ascending)')).toBeInTheDocument()
    expect(useAdminBookings).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sortField: 'start_at', sortDirection: 'asc' }))
  })

  it('shows 20 bookings per page and navigates between pages', () => {
    const bookings = Array.from({ length: 21 }, (_, index) => ({
      id: `booking-${index}`,
      booking_number: `CR-260723-${String(index).padStart(4, '0')}`,
      total_amount: 4500,
      status: 'confirmed',
      profiles: { first_name: `Customer ${index}`, last_name: 'Test', email: `customer${index}@example.com` },
      vehicles: { name: 'Toyota Commuter', plate_number: 'ABC123' },
    }))
    useAdminBookings.mockImplementation(({ page }: { page: number }) => ({
      data: { items: bookings.slice((page - 1) * 20, page * 20), total: bookings.length },
      isLoading: false,
    }))

    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('link', { name: /CR-260723-/ })).toHaveLength(20)
    expect(screen.getByText('Show 20 per page')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getAllByRole('link', { name: /CR-260723-/ })).toHaveLength(1)
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('keeps pagination outside the loading skeleton', () => {
    useAdminBookings.mockReturnValue({
      data: { items: [], total: 21 },
      isLoading: true,
    })

    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5)
  })
})
