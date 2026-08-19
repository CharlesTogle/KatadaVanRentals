import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminLayout from '@/components/admin-layout'
import { CustomerShellFrame } from '@/components/customer-shell-frame'

const useAuthMock = vi.fn()
const useProfileMock = vi.fn()

vi.mock('@/contexts/useAuth', () => ({ useAuth: () => useAuthMock() }))
vi.mock('@/hooks/use-profile', () => ({ useProfile: () => useProfileMock() }))
vi.mock('@/hooks/use-app-settings', () => ({ useAppSettings: () => ({ data: undefined }) }))

describe('mobile drawer direction', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com', user_metadata: { full_name: 'Test User' } },
      signOut: vi.fn(),
    })
    useProfileMock.mockReturnValue({
      data: { role: 'customer', first_name: 'Test', last_name: 'User', profile_image_path: null },
    })
  })

  it('opens the customer drawer from the left', () => {
    render(
      <MemoryRouter>
        <CustomerShellFrame><div>Content</div></CustomerShellFrame>
      </MemoryRouter>,
    )
    const closedDrawer = document.querySelector('aside')
    expect(closedDrawer).toHaveClass('left-0', '-translate-x-full')
    expect(closedDrawer).not.toHaveClass('right-0', 'translate-x-full')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle account menu' }))

    const drawer = screen.getByRole('button', { name: 'Close account menu' }).closest('aside')
    expect(drawer).toHaveClass('left-0', 'translate-x-0')
    expect(drawer).not.toHaveClass('right-0', 'translate-x-full')
  })

  it('opens the admin drawer from the left', () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', profile_image_path: null } })
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    )
    const closedDrawer = document.querySelector('aside')
    expect(closedDrawer).toHaveClass('left-0', '-translate-x-full')
    expect(closedDrawer).not.toHaveClass('right-0', 'translate-x-full')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle admin menu' }))

    const drawer = screen.getByRole('button', { name: 'Close admin menu' }).closest('aside')
    expect(drawer).toHaveClass('left-0', 'translate-x-0')
    expect(drawer).not.toHaveClass('right-0', 'translate-x-full')
  })
})
