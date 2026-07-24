import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import AdminBookingsCreate from '@/pages/admin/bookings-create'

const mutateAsync = vi.fn()
const fetchNextPage = vi.fn()

interface SearchResult {
  data: { pages: { items: { id: string; first_name: string | null; last_name: string | null; email: string; mobile: string | null }[]; nextOffset: number | null }[] }
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

const defaultSearchResult: SearchResult = {
  data: { pages: [{ items: [], nextOffset: null }] },
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage,
}

const customerSearchResult: SearchResult = {
  data: {
    pages: [{
      items: [
        { id: 'customer-1', first_name: 'Alex', last_name: 'Customer', email: 'alex@example.com', mobile: null },
      ],
      nextOffset: null,
    }],
  },
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage,
}

const useAdminCustomerSearchMock = vi.fn<(...args: unknown[]) => SearchResult>(() => defaultSearchResult)

vi.mock('@/hooks/use-admin-booking', () => ({
  useCreateAdminBooking: () => ({ mutateAsync, isPending: false }),
  useAdminCustomerSearch: (q: string) => useAdminCustomerSearchMock(q),
}))

vi.mock('@/hooks/use-vehicles', () => ({
  useAdminVehicles: () => ({
    data: [
      { id: 'vehicle-1', name: 'Toyota Commuter', plate_number: 'ABC123', base_price_per_day: 3500, driver_rate_per_day: 1500, is_available: true },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/errors', () => ({
  showError: (e: Error) => e.message,
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/bookings/create']}>
      <AdminBookingsCreate />
    </MemoryRouter>,
  )
}

describe('AdminBookingsCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAdminCustomerSearchMock.mockReturnValue(defaultSearchResult)
    mutateAsync.mockResolvedValue({
      bookingId: 'booking-new',
      bookingNumber: 'CR-260730-NEW1',
      customerId: 'customer-1',
      status: 'confirmed',
    })
  })

  it('renders page with heading and back link', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /create booking/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to bookings/i })).toHaveAttribute('href', '/admin/bookings')
  })

  it('shows empty price summary before required fields are chosen', () => {
    renderPage()
    expect(screen.getByText(/select a vehicle and the pick-up \/ drop-off date & time/i)).toBeInTheDocument()
  })

  it('defaults to existing customer mode', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /existing customer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select customer/i })).toBeInTheDocument()
  })

  it('switches to new customer mode with invite checked by default', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /new customer/i }))
    expect(screen.getByLabelText(/email a "set your password" invite/i)).toBeChecked()
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument()
  })

  it('shows vehicle options in rental details', () => {
    renderPage()
    expect(screen.getByText('Toyota Commuter (ABC123)')).toBeInTheDocument()
  })

  it('opens customer search dialog and shows results', async () => {
    useAdminCustomerSearchMock.mockReturnValue(customerSearchResult)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /select customer/i }))
    const customerBtn = await screen.findByRole('button', { name: /alex customer/i })
    expect(customerBtn).toBeInTheDocument()
  })

  it('switches between existing and new customer modes', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /existing customer/i })).toHaveClass('bg-[#071f52]')

    fireEvent.click(screen.getByRole('button', { name: /new customer/i }))
    expect(screen.getByRole('button', { name: /new customer/i })).toHaveClass('bg-[#071f52]')
    expect(screen.getByLabelText(/email a "set your password" invite/i)).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /existing customer/i }))
    expect(screen.getByRole('button', { name: /select customer/i })).toBeInTheDocument()
  })

  it('renders form sections for rental details and deposit', () => {
    renderPage()
    expect(screen.getByText('Rental Details')).toBeInTheDocument()
    expect(screen.getByText('Deposit (optional)')).toBeInTheDocument()
    expect(screen.getByText(/leave blank or 0 to skip/i)).toBeInTheDocument()
  })
})
