import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BookingForm from '@/pages/booking-form'
import { useBookingStore } from '@/store/booking-store'

const navigate = vi.fn()
const rpc = vi.fn()
const paymentsInsert = vi.fn()
const functionsInvoke = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'customer@example.com',
      user_metadata: { full_name: 'Alex Customer' },
    },
  }),
}))

vi.mock('@/hooks/use-vehicles', () => ({
  useVehicleById: () => ({
    data: {
      id: 'vehicle-1',
      name: 'Toyota Commuter',
      base_price_per_day: 4500,
      driver_rate_per_day: 800,
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: {
      first_name: 'Alex',
      last_name: 'Customer',
      email: 'customer@example.com',
      mobile: '+63 900 000 0000',
      address: '123 Test St',
      city: 'Quezon City',
      province: 'Metro Manila',
      zip_code: '1100',
      country: 'Philippines',
    },
    isLoading: false,
  }),
}))

const useCustomerDocuments = vi.fn()

vi.mock('@/hooks/use-documents', () => ({
  useCustomerDocuments: (...args: unknown[]) => useCustomerDocuments(...args),
}))

vi.mock('@/hooks/use-payment-methods', () => ({
  usePaymentMethods: () => ({
    data: [{ id: 'pm-1', provider: 'BDO', account_number: '1234', channel: 'bank_transfer' }],
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (table: string) => {
      if (table === 'payments') {
        return { insert: (...args: unknown[]) => paymentsInsert(...args) }
      }

      throw new Error(`Unexpected table ${table}`)
    },
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/receipt.pdf' } })),
      }),
    },
    functions: {
      invoke: (...args: unknown[]) => functionsInvoke(...args),
    },
  },
}))

function renderBookingForm(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/dashboard/book/:vehicleId" element={<BookingForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBookingStore.getState().reset()
    paymentsInsert.mockResolvedValue({ error: null })
    functionsInvoke.mockResolvedValue({ error: null })
  })

  it('blocks self-drive submission when required documents are missing', () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })

    renderBookingForm('/dashboard/book/vehicle-1?type=self-drive&start=2026-07-25T08:00:00.000Z&end=2026-07-26T08:00:00.000Z')

    expect(screen.getByText(/Self Drive is locked until/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Booking' })).toBeDisabled()
  })

  it('submits a booking and sends a confirmation email when documents are complete', async () => {
    useCustomerDocuments.mockReturnValue({
      data: [
        { document_type: 'driver_license', status: 'submitted', file_path: 'driver' },
        { document_type: 'valid_id', status: 'verified', file_path: 'valid' },
        { document_type: 'proof_of_billing', status: 'submitted', file_path: 'billing' },
      ],
      isLoading: false,
    })

    rpc.mockResolvedValue({
      data: {
        id: 'booking-1',
        booking_number: 'CR-260723-ABCD',
        total_amount: 4500,
        deposit_amount: 450,
        remaining_amount: 4050,
      },
      error: null,
    })

    renderBookingForm('/dashboard/book/vehicle-1?type=self-drive&start=2026-07-25T08:00:00.000Z&end=2026-07-26T08:00:00.000Z')

    fireEvent.click(screen.getByRole('button', { name: 'Submit Booking' }))

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('create_booking', expect.objectContaining({
        p_vehicle_id: 'vehicle-1',
        p_rental_model: 'self_drive',
      }))
    })

    expect(functionsInvoke).toHaveBeenCalledWith('send-email', {
      body: expect.objectContaining({
        to: 'customer@example.com',
        subject: expect.stringContaining('CR-260723-ABCD'),
      }),
    })
    expect(navigate).toHaveBeenCalledWith('/bookings')
  })
})
