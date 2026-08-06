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
       peso_per_km: 4500,
       driver_rate_per_day: 800,
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: mockProfile,
    isLoading: false,
  }),
}))

const defaultProfile = {
  first_name: 'Alex',
  last_name: 'Customer',
  email: 'customer@example.com',
  mobile: '+63 900 000 0000',
  address_line_1: 'Unit 3A',
  address_line_2: 'Blue Residences',
  street_address: 'Taft Avenue',
  barangay: 'Barangay 76',
  address: '123 Test St',
  city: 'Quezon City',
  province: 'Metro Manila',
  zip_code: '1100',
  country: 'Philippines',
}

let mockProfile = defaultProfile

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
        upload: vi.fn().mockResolvedValue({ error: null }),
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

function fillPaymentProof() {
  fireEvent.change(screen.getByPlaceholderText('Transaction / Ref #'), { target: { value: 'REF-123' } })
  const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('BookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBookingStore.getState().reset()
    mockProfile = defaultProfile
    window.localStorage.clear()
    paymentsInsert.mockResolvedValue({ error: null })
    functionsInvoke.mockImplementation((name: string, options?: { body?: { entryPlaza?: string } }) => {
      if (name === 'route-quote') {
        return Promise.resolve({
          data: {
            distanceKm: 42,
            durationMinutes: 95,
            tollEstimateAmount: 0,
            tollSegments: [],
            fuelEstimateLiters: 5.25,
            fuelEstimateAmount: 315,
            tollEntryPlaza: null,
            tollEntryExpressway: null,
            tollExitPlaza: null,
            tollExitExpressway: null,
            tollVehicleClass: 1,
            tollRfidBreakdown: [],
          },
          error: null,
        })
      }

      if (name === 'toll-estimate') {
        const body = options?.body
        if (body?.entryPlaza) {
          return Promise.resolve({
            data: {
              tollEstimateAmount: 105,
              tollSegments: [{ name: 'NLEX: Balintawak to Bocaue', amount: 105, currency: 'PHP' }],
              tollEntryPlaza: 'Balintawak',
              tollEntryExpressway: 'NLEX',
              tollExitPlaza: 'Bocaue',
              tollExitExpressway: 'NLEX',
              tollVehicleClass: 1,
              tollRfidBreakdown: [{ system: 'easytrip', amount: 105 }],
            },
            error: null,
          })
        }

        return Promise.resolve({
          data: {
            entryCandidates: [{ id: 'nlex-balintawak', name: 'Balintawak', expressway: 'NLEX', label: 'Balintawak (NLEX)', distanceKm: 1.2 }],
            exitCandidates: [{ id: 'nlex-bocaue', name: 'Bocaue', expressway: 'NLEX', label: 'Bocaue (NLEX)', distanceKm: 2.4 }],
          },
          error: null,
        })
      }

      return Promise.resolve({ error: null })
    })
  })

  it('does not require profile address fields before booking', () => {
    mockProfile = {
      ...defaultProfile,
      address_line_1: '',
      street_address: '',
      barangay: '',
      city: '',
      province: '',
      zip_code: '',
      country: '',
    }
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })

    renderBookingForm('/dashboard/book/vehicle-1?type=with-driver&start=2026-08-05T08:00:00.000Z&end=2026-08-06T08:00:00.000Z')

    expect(screen.queryByText(/Complete your profile before booking/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Address line 1/i)).not.toBeInTheDocument()
  })

  it('sends the back-to-vehicle action to the fleet page', () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })

    renderBookingForm('/dashboard/book/vehicle-1?type=with-driver&start=2026-08-05T08:00:00.000Z&end=2026-08-06T08:00:00.000Z')

    fireEvent.click(screen.getByRole('button', { name: /Back to vehicle/i }))

    expect(navigate).toHaveBeenCalledWith('/our-fleet')
  })

  it('shows drop-off fields only for Just a Drop Off and trip details for Keep the Car', () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })

    renderBookingForm('/dashboard/book/vehicle-1?type=all-in&start=2026-08-05T08:00:00.000Z&end=2026-08-06T08:00:00.000Z')

    expect(screen.getByText(/Fare \(0km × ₱4,500\)/)).toBeInTheDocument()
    expect(screen.queryByText(/Base \(1d × ₱4,500\)/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Pickup Location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Drop-off Location/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Destination/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Purpose of Travel/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Keep the Car/i }))

    expect(screen.getByText(/Base \(1d × ₱4,500\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Destination/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Purpose of Travel/i)).toBeInTheDocument()
  })

  it('blocks self-drive submission when required documents are missing', () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })

    renderBookingForm('/dashboard/book/vehicle-1?type=self-drive&start=2026-08-05T08:00:00.000Z&end=2026-08-06T08:00:00.000Z')

    expect(screen.getByText(/Profile documents required for Self-Drive/i)).toBeInTheDocument()
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

    renderBookingForm('/dashboard/book/vehicle-1?type=self-drive&start=2030-08-05T08:00:00.000Z&end=2030-08-06T08:00:00.000Z')

    await waitFor(() => {
      expect(screen.getByLabelText(/Address Line 1/i)).toHaveValue('Unit 3A')
    })

    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: 'Booking-only address' } })

    fillPaymentProof()

    fireEvent.click(screen.getByRole('button', { name: 'Submit Booking' }))

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('create_booking', expect.objectContaining({
        p_vehicle_id: 'vehicle-1',
        p_rental_model: 'self_drive',
        p_self_drive_address: expect.objectContaining({
          addressLine1: 'Booking-only address',
          streetAddress: 'Taft Avenue',
          barangay: 'Barangay 76',
          city: 'Quezon City',
          province: 'Metro Manila',
          zipCode: '1100',
          country: 'Philippines',
        }),
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

  it('submits all-in with a computed route quote and payment proof', async () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })
    useBookingStore.getState().setLocations({
      pickup: 'Makati City',
      dropoff: 'Pasay City',
      destination: 'NAIA Terminal 3',
    })
    useBookingStore.getState().setRouteSelection('pickup', {
      address: 'Makati City',
      lat: 14.5547,
      lng: 121.0244,
    })
    useBookingStore.getState().setRouteSelection('destination', {
      address: 'NAIA Terminal 3',
      lat: 14.5191,
      lng: 121.0136,
    })
    useBookingStore.getState().setRouteSelection('dropoff', {
      address: 'Pasay City',
      lat: 14.5378,
      lng: 121.0014,
    })

    rpc.mockResolvedValue({
      data: {
        id: 'booking-2',
        booking_number: 'CR-260723-EFGH',
        total_amount: 5300,
        deposit_amount: 450,
        remaining_amount: 4850,
      },
      error: null,
    })

    renderBookingForm('/dashboard/book/vehicle-1?type=all-in&start=2030-08-05T08:00:00.000Z&end=2030-08-06T08:00:00.000Z')

    await waitFor(() => {
      expect(functionsInvoke).toHaveBeenCalledWith('route-quote', expect.any(Object))
    })

    fillPaymentProof()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Booking' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Submit Booking' }))

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('create_booking', expect.objectContaining({
        p_rental_model: 'all_in',
        p_distance_km: 42,
        p_duration_minutes: 95,
        p_fuel_estimate_liters: 5.25,
        p_fuel_estimate_amount: 315,
        p_destination: null,
        p_toll_estimate_amount: 105,
        p_toll_entry_plaza: 'Balintawak',
        p_toll_exit_plaza: 'Bocaue',
      }))
    })

    expect(paymentsInsert).toHaveBeenCalledWith(expect.objectContaining({
      amount: 450,
      reference_number: 'REF-123',
      status: 'submitted',
    }))
  })

  it('does not loop toll calculation after a rejected plaza selection', async () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })
    useBookingStore.getState().setLocations({
      pickup: 'Makati City',
      dropoff: 'Pasay City',
      destination: 'NAIA Terminal 3',
    })
    useBookingStore.getState().setRouteSelection('pickup', {
      address: 'Makati City',
      lat: 14.5547,
      lng: 121.0244,
    })
    useBookingStore.getState().setRouteSelection('destination', {
      address: 'NAIA Terminal 3',
      lat: 14.5191,
      lng: 121.0136,
    })
    useBookingStore.getState().setRouteSelection('dropoff', {
      address: 'Pasay City',
      lat: 14.5378,
      lng: 121.0014,
    })
    functionsInvoke.mockImplementation((name: string, options?: { body?: { entryPlaza?: string } }) => {
      if (name === 'route-quote') {
        return Promise.resolve({
          data: {
            distanceKm: 42,
            durationMinutes: 95,
            tollEstimateAmount: 0,
            tollSegments: [],
            fuelEstimateLiters: 5.25,
            fuelEstimateAmount: 315,
            tollEntryPlaza: null,
            tollEntryExpressway: null,
            tollExitPlaza: null,
            tollExitExpressway: null,
            tollVehicleClass: 1,
            tollRfidBreakdown: [],
          },
          error: null,
        })
      }

      if (name === 'toll-estimate' && options?.body?.entryPlaza) {
        return Promise.resolve({ data: { error: 'Invalid toll plaza selection' }, error: new Error('Edge Function returned a non-2xx status code') })
      }

      if (name === 'toll-estimate') {
        return Promise.resolve({
          data: {
            entryCandidates: [{ id: 'nlex-balintawak', name: 'Balintawak', expressway: 'NLEX', label: 'Balintawak (NLEX)', distanceKm: 1.2 }],
            exitCandidates: [{ id: 'nlex-bocaue', name: 'Bocaue', expressway: 'NLEX', label: 'Bocaue (NLEX)', distanceKm: 2.4 }],
          },
          error: null,
        })
      }

      return Promise.resolve({ error: null })
    })

    renderBookingForm('/dashboard/book/vehicle-1?type=all-in&start=2026-08-05T08:00:00.000Z&end=2026-08-06T08:00:00.000Z')

    await waitFor(() => {
      expect(functionsInvoke.mock.calls.filter(([name, options]) => name === 'toll-estimate' && options?.body?.entryPlaza)).toHaveLength(1)
    })
    expect(screen.getAllByText(/We can't compute the toll price yet/).length).toBeGreaterThanOrEqual(1)

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(functionsInvoke.mock.calls.filter(([name, options]) => name === 'toll-estimate' && options?.body?.entryPlaza)).toHaveLength(1)
  })

  it('does not block booking when the profile is complete', () => {
    useCustomerDocuments.mockReturnValue({
      data: [
        { document_type: 'driver_license', status: 'submitted', file_path: 'driver' },
        { document_type: 'valid_id', status: 'verified', file_path: 'valid' },
        { document_type: 'proof_of_billing', status: 'submitted', file_path: 'billing' },
      ],
      isLoading: false,
    })

    renderBookingForm('/dashboard/book/vehicle-1?type=with-driver&start=2026-08-05T08:00:00.000Z&end=2026-08-06T08:00:00.000Z')
    fireEvent.click(screen.getByRole('button', { name: /Keep the Car/i }))

    expect(screen.queryByText(/Complete your profile before booking/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Booking' })).toBeDisabled()

    fillPaymentProof()

    expect(screen.getByRole('button', { name: 'Submit Booking' })).toBeEnabled()
  })

  it('hydrates stored dates and keeps them editable on the booking page', async () => {
    useCustomerDocuments.mockReturnValue({ data: [], isLoading: false })
    window.localStorage.setItem('booking-date-selection', JSON.stringify({
      start: '2026-08-05T08:00',
      end: '2026-08-06T10:30',
    }))

    renderBookingForm('/dashboard/book/vehicle-1?type=with-driver')

    await waitFor(() => {
      expect(screen.getByLabelText(/Pick-up Date & Time/i)).toHaveValue('2026-08-05T08:00')
    })

    const pickupDateTimeInput = screen.getByLabelText(/Pick-up Date & Time/i)
    fireEvent.change(pickupDateTimeInput, { target: { value: '2026-08-05T09:15' } })

    expect(pickupDateTimeInput).toHaveValue('2026-08-05T09:15')
    expect(JSON.parse(window.localStorage.getItem('booking-date-selection') || '{}')).toEqual({
      start: '2026-08-05T09:15',
      end: '2026-08-06T10:30',
    })
  })
})
