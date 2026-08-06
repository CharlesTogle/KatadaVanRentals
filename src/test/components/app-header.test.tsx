import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from '@/components/app-header'

const useAuthMock = vi.fn()
const useProfileMock = vi.fn()

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => useProfileMock(),
}))

vi.mock('@/hooks/use-app-settings', () => ({
  useAppSettings: () => ({ data: undefined }),
}))

describe('AppHeader', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    useProfileMock.mockReset()
  })

  it('renders the unauthenticated header links and actions', () => {
    useAuthMock.mockReturnValue({ user: null, signOut: vi.fn() })
    useProfileMock.mockReturnValue({ data: undefined })

    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    )

    expect(screen.getByText('Our Fleet')).toBeDefined()
    expect(screen.getByText('Contact')).toBeDefined()
    expect(screen.getByText('FAQ')).toBeDefined()
    expect(screen.getByText('Services')).toBeDefined()
    expect(screen.getByText('Why Katada')).toBeDefined()
    expect(screen.getByText('Sign in')).toBeDefined()
    expect(screen.getByText('Book Now')).toBeDefined()
  })

  it('renders public nav plus customer account dropdown for signed-in customers', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'charles@example.com',
        user_metadata: { full_name: 'Charles Nathaniel Togle' },
      },
      signOut: vi.fn(),
    })
    useProfileMock.mockReturnValue({
      data: {
        role: 'customer',
        first_name: 'Charles',
        last_name: 'Togle',
        profile_image_path: null,
      },
    })

    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    )

    expect(screen.getByText('Services')).toBeDefined()
    expect(screen.getByText('Why Katada')).toBeDefined()
    expect(screen.getByText('FAQ')).toBeDefined()
    expect(screen.getByText('Contact')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /charles togle/i }))

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('My Bookings')).toBeDefined()
    expect(screen.getByText('Documents')).toBeDefined()
    expect(screen.getByText('My Profile')).toBeDefined()
    expect(screen.getByText('Logout')).toBeDefined()
  })

  it('renders the admin header without public support links', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-2',
        email: 'admin@example.com',
        user_metadata: { full_name: 'Admin User' },
      },
      signOut: vi.fn(),
    })
    useProfileMock.mockReturnValue({
      data: {
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        profile_image_path: null,
      },
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppHeader />
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.queryByText('Contact')).toBeNull()
    expect(screen.queryByText('FAQ')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /admin user/i }))

    expect(screen.getAllByText('Dashboard')).toHaveLength(2)
    expect(screen.queryByText('My Bookings')).toBeNull()
  })
})
