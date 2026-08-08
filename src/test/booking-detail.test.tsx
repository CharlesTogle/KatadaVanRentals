import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BookingDetail from '@/pages/booking-detail'

const useBooking = vi.fn()
const useCancelOwnBooking = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
const useAcceptOwnPriceAdjustment = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
const useAuthMock = vi.fn(() => ({ user: { id: 'user-1' } }))
const useAppSettingsMock = vi.fn(() => ({ data: { booking_expiry_hours: 2 } }))

vi.mock('@/hooks/use-bookings', () => ({
  useBooking: (...args: unknown[]) => useBooking(...args),
  useCancelOwnBooking: () => useCancelOwnBooking(),
  useAcceptOwnPriceAdjustment: () => useAcceptOwnPriceAdjustment(),
}))

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/hooks/use-app-settings', () => ({
  useAppSettings: () => useAppSettingsMock(),
}))

vi.mock('@/hooks/use-payment-methods', () => ({
  usePaymentMethods: () => ({ data: [] }),
}))

vi.mock('@/lib/invoice-pdf', () => ({
  downloadBookingInvoicePdf: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockInsertSingle = vi.fn().mockResolvedValue({ data: { id: 'rd-1' }, error: null })
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsertSingle })) }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'booking_requested_document_types') return { insert: mockInsert, delete: mockDelete }
      return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsertSingle })) })) }
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/receipt.png' }, error: null }),
        upload: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
}))

function renderDetail(id = 'booking-1') {
  return render(
    <MemoryRouter initialEntries={[`/bookings/${id}`]}>
      <Routes>
        <Route path="/bookings/:id" element={<BookingDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BookingDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } })
    useCancelOwnBooking.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    useAcceptOwnPriceAdjustment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('renders the richer customer booking view using admin-like sections', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'keep',
          status: 'confirmed',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: 'Please call on arrival.',
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 9000,
          paid_amount: 2000,
          remaining_amount: 7000,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [{ id: 'payment-1', channel: 'bank_transfer', status: 'submitted', amount: 2000, reference_number: 'REF-123', receipt_path: 'booking-1/receipt.png', paid_at: null, created_at: '2026-07-23T10:15:00Z' }],
        status_events: [{ id: 'event-1', from_status: 'for_review', to_status: 'confirmed', note: 'Approved', created_at: '2026-07-23T10:30:00Z' }],
        extensions: [{ id: 'extension-1', previous_end_at: '2026-07-27T08:00:00Z', new_end_at: '2026-07-28T08:00:00Z', extension_amount: 1500, reason: 'Extended one day', created_at: '2026-07-26T09:00:00Z' }],
        invoice: { id: 'invoice-1', invoice_number: 'INV-1001', status: 'issued', total_amount: 9000, file_path: null, issued_at: '2026-07-23T11:00:00Z' },
        feedback: null,
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getAllByText('CR-260723-ABCD').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Booking Details')).toBeInTheDocument()
    expect(screen.getByText('Price Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Payments')).toBeInTheDocument()
    expect(screen.getByText('Status History')).toBeInTheDocument()
    expect(screen.getByText('Extensions')).toBeInTheDocument()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.getByText('Toyota Commuter')).toBeInTheDocument()
    expect(screen.getByText('Please call on arrival.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view receipt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel Booking' })).toBeInTheDocument()
    expect(screen.queryByText('Documents')).not.toBeInTheDocument()
    expect(screen.queryByText('Actions')).not.toBeInTheDocument()
  })

  it('shows distance instead of duration for with-driver dropoff bookings', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'dropoff',
          status: 'confirmed',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-25T10:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: 42,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 9000,
          paid_amount: 2000,
          remaining_amount: 7000,
          price_line_items: [{ label: 'Base Rate', detail: '42km × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [],
        extensions: [],
        invoice: null,
        feedback: null,
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Distance')).toBeInTheDocument()
      expect(screen.getByText('42 km')).toBeInTheDocument()
      expect(screen.queryByText('Duration')).not.toBeInTheDocument()
    })
  })

  it('shows all-in fuel and toll estimates as estimate-only rows in price breakdown', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_in',
          booking_mode: 'keep',
          status: 'confirmed',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: 42,
          duration_minutes: 95,
          toll_estimate_amount: 105,
          toll_segments: [],
          fuel_estimate_liters: 5.25,
          fuel_estimate_amount: 315,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 450,
          subtotal_amount: 5300,
          total_amount: 5300,
          paid_amount: 450,
          remaining_amount: 4850,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 4500 }, { label: 'Driver', detail: '2 days × ₱800', amount: 800 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Fuel Estimate')).toBeInTheDocument()
      expect(screen.getByText('Toll Estimate')).toBeInTheDocument()
      expect(screen.getAllByText('estimate only - settled after trip').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('does not ask for another review when feedback already exists', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'keep',
          status: 'completed',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 9000,
          paid_amount: 9000,
          remaining_amount: 0,
          price_line_items: [],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [],
        cancellation: null,
        extensions: [],
        invoice: null,
        requested_document_types: [],
        feedback: { id: 'feedback-1', rating: 5, feedback: 'Great trip', created_at: '2026-07-28T10:00:00Z' },
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Review submitted! Thank you for your feedback.')).toBeInTheDocument()
    })

    expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit review/i })).not.toBeInTheDocument()
  })

  it('does not show the complete address block as customer note', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'self_drive',
          booking_mode: 'keep',
          status: 'confirmed',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: 'Complete Address: Unit 3A, Blue Residences, Taft Avenue',
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 9000,
          paid_amount: 2000,
          remaining_amount: 7000,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
    })

    renderDetail()

    expect(screen.queryByText('Customer Note')).not.toBeInTheDocument()
    expect(screen.queryByText(/Complete Address:/)).not.toBeInTheDocument()
  })

  it('renders the pending price approval card for customers', async () => {
    const cancelOwnBooking = vi.fn().mockResolvedValue(undefined)
    const acceptAdjustment = vi.fn().mockResolvedValue(undefined)
    useCancelOwnBooking.mockReturnValue({ mutateAsync: cancelOwnBooking, isPending: false })
    useAcceptOwnPriceAdjustment.mockReturnValue({ mutateAsync: acceptAdjustment, isPending: false })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-24T04:00:00Z'))

    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'keep',
          status: 'pending_price_approval',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 10000,
          paid_amount: 2000,
          remaining_amount: 8000,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [{ id: 'event-adjusted', from_status: null, to_status: 'pending_price_approval', note: 'Price adjusted to 10000. Reason: Out-of-city surcharge', created_at: '2026-07-23T10:30:00Z' }],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
    })

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('No longer pushing through')

    renderDetail()

    expect(screen.getAllByText('Pending price approval').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Old Remaining Balance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Price Adjustment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('New Remaining Balance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Out-of-city surcharge').length).toBeGreaterThan(0)
    expect(screen.getByText(/Respond by Jul 25, 2026, 2:00 PM/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel Booking' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Accept Adjustment' }))
    expect(screen.getByRole('button', { name: 'Accepting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decline & Cancel' })).toBeDisabled()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(acceptAdjustment).toHaveBeenCalledWith({ id: 'booking-1' })

    expect(screen.getByRole('button', { name: 'Accept Adjustment' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Decline & Cancel' }))
    expect(screen.getByRole('button', { name: 'Canceling...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Accept Adjustment' })).toBeDisabled()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(cancelOwnBooking).toHaveBeenCalledWith({ id: 'booking-1', reason: 'No longer pushing through' })

    promptSpy.mockRestore()
    vi.useRealTimers()
  })

  it('cancels instead of accepting when the price approval deadline has passed', async () => {
    const cancelOwnBooking = vi.fn().mockResolvedValue(undefined)
    const acceptAdjustment = vi.fn().mockResolvedValue(undefined)
    useCancelOwnBooking.mockReturnValue({ mutateAsync: cancelOwnBooking, isPending: false })
    useAcceptOwnPriceAdjustment.mockReturnValue({ mutateAsync: acceptAdjustment, isPending: false })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T07:00:01Z'))

    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'keep',
          status: 'pending_price_approval',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 10000,
          paid_amount: 2000,
          remaining_amount: 8000,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [{ id: 'event-adjusted', from_status: null, to_status: 'pending_price_approval', note: 'Price adjusted to 10000. Reason: Out-of-city surcharge', created_at: '2026-07-23T10:30:00Z' }],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
    })

    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Accept Adjustment' }))
    expect(screen.getByRole('button', { name: 'Accepting...' })).toBeDisabled()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(cancelOwnBooking).toHaveBeenCalledWith({ id: 'booking-1', reason: 'Price adjustment approval deadline passed.' })
    expect(acceptAdjustment).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('does not render a pending price approval card without a matching status event note', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'keep',
          status: 'pending_price_approval',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 10000,
          paid_amount: 2000,
          remaining_amount: 8000,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [],
        extensions: [],
        invoice: null,
      },
      isLoading: false,
    })

    renderDetail()

    expect(screen.getAllByText('Pending price approval').length).toBeGreaterThan(0)
    expect(screen.queryByText('Old Remaining Balance')).not.toBeInTheDocument()
    expect(screen.queryByText('Price Adjustment')).not.toBeInTheDocument()
    expect(screen.queryByText('New Remaining Balance')).not.toBeInTheDocument()
  })

  it('shows requested-documents card with admin note when status is awaiting_documents', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'self_drive',
          booking_mode: 'keep',
          status: 'awaiting_documents',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 500,
          subtotal_amount: 5000,
          total_amount: 5000,
          paid_amount: 0,
          remaining_amount: 4500,
          price_line_items: [],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [
          { id: 'event-1', from_status: 'for_review', to_status: 'awaiting_documents', note: 'Please upload your valid ID and proof of billing.', created_at: '2026-07-23T10:30:00Z' },
        ],
        extensions: [],
        invoice: null,
        requested_document_types: [
          { id: 'type-1', label: 'Valid ID', upload: null },
        ],
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Requested documents')).toBeInTheDocument()
    })

    expect(screen.getByText(/Request sent/)).toBeInTheDocument()
    expect(screen.getByText('Valid ID')).toBeInTheDocument()
    expect(screen.getByText('Upload file')).toBeInTheDocument()
    expect(screen.getAllByText('Please upload your valid ID and proof of billing.').length).toBeGreaterThanOrEqual(1)
  })

  it('lists already-uploaded requested documents in the card', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'self_drive',
          booking_mode: 'keep',
          status: 'awaiting_documents',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 500,
          subtotal_amount: 5000,
          total_amount: 5000,
          paid_amount: 0,
          remaining_amount: 4500,
          price_line_items: [],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [
          { id: 'event-1', from_status: 'for_review', to_status: 'awaiting_documents', note: 'Please upload documents.', created_at: '2026-07-23T10:30:00Z' },
        ],
        extensions: [],
        invoice: null,
        requested_document_types: [
          { id: 'type-1', label: 'Valid ID', upload: { id: 'rd-1', file_path: 'user-1/requested/booking-1/doc.pdf', original_filename: 'id_scan.pdf', mime_type: 'application/pdf', status: 'submitted', created_at: '2026-07-23T11:00:00Z' } },
        ],
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Requested documents')).toBeInTheDocument()
    })

    expect(screen.getByText('id_scan.pdf')).toBeInTheDocument()
    expect(screen.getByText('Uploaded')).toBeInTheDocument()
  })

  it('does not show requested-documents card for non-awaiting_documents status', async () => {
    useBooking.mockReturnValue({
      data: {
        booking: {
          id: 'booking-1',
          booking_number: 'CR-260723-ABCD',
          customer_id: 'user-1',
          guest_name: null,
          guest_email: null,
          guest_mobile: null,
          vehicle_id: 'veh-1',
          rental_model: 'all_out',
          booking_mode: 'keep',
          status: 'confirmed',
          start_at: '2026-07-25T08:00:00Z',
          end_at: '2026-07-27T08:00:00Z',
          duration_days: 2,
          pickup_location: 'Manila',
          dropoff_location: 'Batangas',
          destination: 'Taal',
          purpose_of_travel: 'Leisure',
          notes: null,
          distance_km: null,
          duration_minutes: null,
          toll_estimate_amount: 0,
          toll_segments: [],
          fuel_estimate_liters: 0,
          fuel_estimate_amount: 0,
          delivery_fee: 0,
          recovery_fee: 0,
          discount_amount: 0,
          deposit_amount: 900,
          subtotal_amount: 9000,
          total_amount: 9000,
          paid_amount: 2000,
          remaining_amount: 7000,
          price_line_items: [{ label: 'Base Rate', detail: '2 days × ₱4,500', amount: 9000 }],
          idempotency_key: null,
          created_by: 'user-1',
          created_at: '2026-07-23T10:00:00Z',
          updated_at: '2026-07-23T10:00:00Z',
        },
        vehicle: { id: 'veh-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
        payments: [],
        status_events: [],
        extensions: [],
        invoice: null,
        requested_document_types: [],
      },
      isLoading: false,
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Booking Details')).toBeInTheDocument()
    })

    expect(screen.queryByText('Requested documents')).not.toBeInTheDocument()
  })
})
