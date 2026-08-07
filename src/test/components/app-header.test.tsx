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

    expect(screen.getByRole('link', { name: 'Our Fleet' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Contact' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'FAQ' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Services' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Why Katada' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Book Now' })).toBeDefined()
  })

  it('opens the mobile drawer for guests', () => {
    useAuthMock.mockReturnValue({ user: null, signOut: vi.fn() })
    useProfileMock.mockReturnValue({ data: undefined })

    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))

    expect(screen.getByRole('button', { name: 'Close menu' })).toBeDefined()
    expect(screen.getAllByRole('link', { name: 'Book Now' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Our Fleet' })).toHaveLength(2)
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

    expect(screen.getByRole('link', { name: 'Services' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Why Katada' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'FAQ' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Contact' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /charles togle/i }))

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'My Bookings' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Documents' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'My Profile' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeDefined()
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

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Contact' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'FAQ' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /admin user/i }))

    expect(screen.getAllByRole('link', { name: 'Dashboard' })).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'My Bookings' })).toBeNull()
  })
})
