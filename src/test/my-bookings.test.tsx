import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import MyBookings from '@/pages/my-bookings'

const useMyBookings = vi.fn()

vi.mock('@/hooks/use-bookings', () => ({
  useMyBookings: (...args: unknown[]) => useMyBookings(...args),
}))

describe('MyBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders live booking cards from query data', () => {
    useMyBookings.mockReturnValue({
      data: [
        {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          start_at: '2026-07-25T08:00:00.000Z',
          end_at: '2026-07-26T08:00:00.000Z',
          duration_days: 1,
          total_amount: 4500,
          paid_amount: 450,
          remaining_amount: 4050,
          status: 'for_review',
          vehicles: { name: 'Toyota Commuter' },
        },
      ],
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    )

    expect(screen.getByText('CR-260723-ABCD')).toBeInTheDocument()
    expect(screen.getByText('Toyota Commuter')).toBeInTheDocument()
    expect(screen.getByText('₱4,500.00')).toBeInTheDocument()
    expect(screen.getByText('₱450.00')).toBeInTheDocument()
    expect(screen.getByText('₱4,050.00')).toBeInTheDocument()
  })

  it('requests the chosen status filter from the hook', () => {
    useMyBookings.mockReturnValue({ data: [], isLoading: false })

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirmed' }))

    expect(useMyBookings).toHaveBeenLastCalledWith('confirmed')
  })
})
