import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Customers from '@/pages/admin/customers'

const mockCustomers = [
  {
    id: 'cust-1',
    first_name: 'Alex',
    last_name: 'Santos',
    email: 'alex@example.com',
    mobile: '09171234567',
    city: 'Manila',
    province: 'Metro Manila',
    country: 'Philippines',
    joined_at: '2025-01-15T00:00:00Z',
    last_login_at: '2026-07-20T10:00:00Z',
    is_active: true,
    bookings_count: 3,
    total_spend: 15000,
  },
  {
    id: 'cust-2',
    first_name: 'Maria',
    last_name: 'Cruz',
    email: 'maria@example.com',
    mobile: null,
    city: null,
    province: null,
    country: 'Philippines',
    joined_at: '2025-06-01T00:00:00Z',
    last_login_at: null,
    is_active: false,
    bookings_count: 0,
    total_spend: 0,
  },
]

const useAdminCustomers = vi.fn()
const deactivateCustomer = vi.fn()
const reactivateCustomer = vi.fn()
const deleteCustomer = vi.fn()
const invalidateQueries = vi.fn()

vi.mock('@/hooks/use-profile', () => ({
  useAdminCustomers: (...args: unknown[]) => useAdminCustomers(...args),
}))

vi.mock('@/services/profile-service', () => ({
  deactivateCustomer: (...args: unknown[]) => deactivateCustomer(...args),
  reactivateCustomer: (...args: unknown[]) => reactivateCustomer(...args),
  deleteCustomer: (...args: unknown[]) => deleteCustomer(...args),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  }
})

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/errors', () => ({
  showError: (e: Error) => e.message,
}))

describe('Admin Customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    useAdminCustomers.mockReturnValue({ data: mockCustomers, isLoading: false })
    deactivateCustomer.mockResolvedValue(undefined)
    reactivateCustomer.mockResolvedValue(undefined)
    deleteCustomer.mockResolvedValue(undefined)
  })

  it('renders customer rows with all columns', () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    expect(screen.getByText('Alex Santos')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('09171234567')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('₱15,000.00')).toBeInTheDocument()
    expect(screen.getByText('Manila, Metro Manila, Philippines')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('renders the header and subtitle', () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Manage customer accounts and view booking activity.')).toBeInTheDocument()
  })

  it('renders search input with correct placeholder', () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    expect(screen.getByPlaceholderText('Name, email, or mobile...')).toBeInTheDocument()
  })

  it('renders Export CSV button', () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument()
  })

  it('opens kebab menu and shows View Profile link', () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for Alex Santos' }))

    const viewLink = screen.getByRole('link', { name: 'View Profile' })
    expect(viewLink).toHaveAttribute('href', '/admin/customers/cust-1')
  })

  it('deactivates an active customer via kebab menu', async () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for Alex Santos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Account' }))

    await waitFor(() => {
      expect(deactivateCustomer).toHaveBeenCalledWith('cust-1')
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin', 'customers'] })
    })
  })

  it('reactivates an inactive customer via kebab menu', async () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for Maria Cruz' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Account' }))

    await waitFor(() => {
      expect(reactivateCustomer).toHaveBeenCalledWith('cust-2')
    })
  })

  it('deletes a customer via kebab menu', async () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open actions for Alex Santos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }))

    await waitFor(() => {
      expect(deleteCustomer).toHaveBeenCalledWith('cust-1')
    })
  })

  it('shows loading skeleton', () => {
    useAdminCustomers.mockReturnValue({ data: [], isLoading: true })

    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows empty state when no customers', () => {
    useAdminCustomers.mockReturnValue({ data: [], isLoading: false })

    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    )

    expect(screen.getByText('No customers found.')).toBeInTheDocument()
  })
})
