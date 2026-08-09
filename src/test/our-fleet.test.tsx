import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OurFleet from '@/pages/our-fleet'
import { LocationsFields } from '@/components/booking/locations-fields'
import { useBookingStore } from '@/store/booking-store'

const useAuthMock = vi.fn()
const useProfileMock = vi.fn()
const useVehiclesMock = vi.fn()
const findAvailableVehicleIdsMock = vi.fn()

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => useProfileMock(),
}))

vi.mock('@/hooks/use-vehicles', () => ({
  useVehicles: () => useVehiclesMock(),
  useAvailableVehicleIds: () => ({ mutateAsync: findAvailableVehicleIdsMock, isPending: false }),
}))

vi.mock('@/components/customer-shell-frame', () => ({
  CustomerShellFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/app-header', () => ({
  AppHeader: () => <div>Header</div>,
}))

describe('OurFleet', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    useProfileMock.mockReset()
    useVehiclesMock.mockReset()
    findAvailableVehicleIdsMock.mockReset()
    window.localStorage.clear()

    useAuthMock.mockReturnValue({ user: null })
    useProfileMock.mockReturnValue({ data: undefined })
    useVehiclesMock.mockReturnValue({ data: [
      { id: 'vehicle-1', slug: 'vehicle-1', name: 'Vehicle 1', image_paths: [], passenger_count: 10, base_price_per_day: 1000 },
      { id: 'vehicle-2', slug: 'vehicle-2', name: 'Vehicle 2', image_paths: [], passenger_count: 10, base_price_per_day: 1000 },
    ], isLoading: false })
    findAvailableVehicleIdsMock.mockResolvedValue(['vehicle-1'])
    useBookingStore.getState().reset()
  })

  it('lets customers enter pickup and drop-off time separately from the date', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP DATE & TIME/i), { target: { value: '2026-08-01T09:30' } })
    fireEvent.change(screen.getByLabelText(/DROP-OFF DATE & TIME/i), { target: { value: '2026-08-03T17:45' } })

    expect(JSON.parse(window.localStorage.getItem('booking-date-selection') || '{}')).toEqual({
      start: '2026-08-01T09:30',
      end: '2026-08-03T17:45',
    })
  })

  it('persists and displays only vehicles returned for the selected booking window', async () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP DATE & TIME/i), { target: { value: '2026-08-12T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    expect(findAvailableVehicleIdsMock).toHaveBeenCalledWith({ startAt: '2026-08-12T09:00', endAt: '2026-08-13T09:00' })
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('booking-date-selection') || '{}')).toMatchObject({
        availableVehicleIds: ['vehicle-1'],
        availabilityChecked: true,
      })
      expect(screen.getByText('Vehicle 1')).toBeInTheDocument()
      expect(screen.queryByText('Vehicle 2')).not.toBeInTheDocument()
    })
  })

  it('does not hide vehicles when saved dates have not been checked for availability', () => {
    window.localStorage.setItem('booking-date-selection', JSON.stringify({
      start: '2026-08-12T09:00',
      end: '2026-08-13T09:00',
      availableVehicleIds: [],
    }))

    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    expect(screen.getByText('Vehicle 1')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 2')).toBeInTheDocument()
  })

  it('auto-fills drop-off to 24 hours after the pickup date and time', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP DATE & TIME/i), { target: { value: '2026-08-01T09:30' } })

    expect(screen.getByLabelText(/DROP-OFF DATE & TIME/i)).toHaveValue('2026-08-02T09:30')
    expect(JSON.parse(window.localStorage.getItem('booking-date-selection') || '{}')).toEqual({
      start: '2026-08-01T09:30',
      end: '2026-08-02T09:30',
    })
  })

  it('shows the applied filters text after clicking Find a Car', async () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP AND DROP-OFF LOCATION/i), { target: { value: 'Makati' } })
    fireEvent.change(screen.getByLabelText(/PICK-UP DATE & TIME/i), { target: { value: '2026-08-01T09:30' } })
    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    await waitFor(() => {
      expect(screen.getByText(/Showing results for:/)).toBeInTheDocument()
      expect(screen.getByText('Pick up:')).toBeInTheDocument()
      expect(screen.getByText('Makati, August 1, 2026 9:30 AM')).toBeInTheDocument()
      expect(screen.getByText('Drop off:')).toBeInTheDocument()
      expect(screen.getByText('Makati, August 2, 2026 9:30 AM')).toBeInTheDocument()
    })
  })

  it('shows the drop-off field only when returning to a different location is selected', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP AND DROP-OFF LOCATION/i), { target: { value: 'Makati City' } })

    expect(screen.queryByLabelText(/^DROP-OFF LOCATION$/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Return to a different location/i))

    expect(screen.getByLabelText(/^DROP-OFF LOCATION$/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^DROP-OFF LOCATION$/i), { target: { value: 'NAIA Terminal 3' } })

    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    expect(useBookingStore.getState().locations).toMatchObject({
      pickup: 'Makati City',
      dropoff: 'NAIA Terminal 3',
    })

    cleanup()
    render(
      <MemoryRouter initialEntries={['/dashboard/book/vehicle-1?type=self-drive']}>
        <LocationsFields />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/Delivery & Return Location/i)).toHaveValue('Makati City')
  })

  it('uses the pickup location as the return location when a different return point is not selected', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP AND DROP-OFF LOCATION/i), { target: { value: 'BGC' } })
    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    expect(useBookingStore.getState().locations).toMatchObject({
      pickup: 'BGC',
      dropoff: 'BGC',
    })
  })
})
