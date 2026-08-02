import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
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
      data: [
        {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          total_amount: 4500,
          status: 'for_review',
          profiles: { first_name: 'Alex', last_name: 'Customer', email: 'alex@example.com' },
          vehicles: { name: 'Toyota Commuter', plate_number: 'ABC123' },
        },
        {
          id: 'booking-2',
          booking_number: 'CR-260723-EFGH',
          total_amount: 3200,
          status: 'confirmed',
          profiles: { first_name: 'Bea', last_name: 'Customer', email: 'bea@example.com' },
          vehicles: { name: 'Toyota Hiace', plate_number: 'XYZ987' },
        },
        {
          id: 'booking-3',
          booking_number: 'CR-260723-IJKL',
          total_amount: 5100,
          status: 'awaiting_documents',
          profiles: { first_name: 'Carl', last_name: 'Customer', email: 'carl@example.com' },
          vehicles: { name: 'Nissan Urvan', plate_number: 'LMN456' },
        },
      ],
      isLoading: false,
    })
    deleteMutateAsync.mockResolvedValue(undefined)
  })

  it('opens the kebab menu and deletes a booking', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for CR-260723-ABCD' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 'booking-1' })
    })
  })

  it('opens the kebab menu with a view details link to the detail page', () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for CR-260723-ABCD' }))

    const link = screen.getByRole('link', { name: 'View Details' })
    expect(link).toHaveAttribute('href', '/admin/bookings/CR-260723-ABCD')
  })

  it('opens the last row action menu upward', () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for CR-260723-IJKL' }))

    const menu = screen.getByRole('link', { name: 'View Details' }).parentElement
    expect(menu).toHaveClass('bottom-11')
    expect(menu).not.toHaveClass('top-11')
  })

  it('renders create booking CTA linking to the create page', () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Create booking' })).toHaveAttribute('href', '/admin/bookings/create')
  })
})
