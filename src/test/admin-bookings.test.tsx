import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminBookings from '@/pages/admin/bookings'

const useAdminBookings = vi.fn()
const mutateAsync = vi.fn()

vi.mock('@/hooks/use-bookings', () => ({
  useAdminBookings: (...args: unknown[]) => useAdminBookings(...args),
  useUpdateBookingStatus: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('AdminBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    mutateAsync.mockResolvedValue(undefined)
  })

  it('renders admin actions for live bookings and updates status on click', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 'booking-1', status: 'confirmed' })
    })
  })
})
