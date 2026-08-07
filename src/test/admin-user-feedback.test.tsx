import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import AdminUserFeedback from '@/pages/admin/user-feedback'

const { useAdminFeedback, useSetFeedbackHomepageVisibility } = vi.hoisted(() => ({
  useAdminFeedback: vi.fn(),
  useSetFeedbackHomepageVisibility: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/hooks/use-bookings', () => ({
  useAdminFeedback: (...args: unknown[]) => useAdminFeedback(...args),
  useSetFeedbackHomepageVisibility,
}))

describe('Admin User Feedback', () => {
  it('renders feedback cards and booking links', () => {
    useAdminFeedback.mockReturnValue({
      data: [
        {
          id: 'feedback-1',
          customer_name: 'Alex Santos',
          customer_email: 'alex@example.com',
          profile_image_path: null,
          rating: 5,
          feedback: 'Driver was on time and the van was clean.',
          display_on_homepage: false,
          vehicle_plate: 'ABC-1234',
          booking_number: 'CR-260723-ABCD',
          created_at: '2026-08-01T08:00:00Z',
        },
      ],
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <AdminUserFeedback />
      </MemoryRouter>,
    )

    expect(screen.getByText('User Feedback')).toBeInTheDocument()
    expect(screen.getByText('Alex Santos')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('Driver was on time and the van was clean.')).toBeInTheDocument()
    expect(screen.getByText('Plate: ABC-1234')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View booking' })).toHaveAttribute('href', '/admin/bookings/CR-260723-ABCD')
    expect(screen.getByLabelText('Display on homepage')).not.toBeChecked()
  })

  it('shows empty state', () => {
    useAdminFeedback.mockReturnValue({ data: [], isLoading: false, error: null })

    render(
      <MemoryRouter>
        <AdminUserFeedback />
      </MemoryRouter>,
    )

    expect(screen.getByText('No feedback found.')).toBeInTheDocument()
  })
})
