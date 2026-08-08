import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import Login from '@/pages/login'

const { signInWithPassword, from, update, updateEq } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}))
let resolveUpdate: ((value: { error: null }) => void) | undefined

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword }, from },
}))

vi.mock('@/hooks/use-app-settings', () => ({
  useAppSettings: () => ({ data: undefined }),
}))

function LocationDisplay() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

describe('Login last login timestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveUpdate = undefined
    signInWithPassword.mockResolvedValue({ error: null, data: { user: { id: 'user-1' } } })
    from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'customer', is_active: true } }) }) }),
      update,
    }))
    update.mockReturnValue({
      eq: updateEq.mockImplementation(() => new Promise((resolve) => {
        resolveUpdate = resolve
      })),
    })
  })

  it('writes last_login_at before navigating away', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
        <LocationDisplay />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'customer@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ last_login_at: expect.any(String) }))
    expect(screen.getByTestId('location')).toHaveTextContent('/login')

    resolveUpdate?.({ error: null })
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))
    expect(updateEq).toHaveBeenCalledWith('id', 'user-1')
  })
})
