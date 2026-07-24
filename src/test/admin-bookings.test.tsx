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

  it('renders create booking CTA linking to the create page', () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Create booking' })).toHaveAttribute('href', '/admin/bookings/create')
  })
})
