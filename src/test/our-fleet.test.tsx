import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OurFleet from '@/pages/our-fleet'
import { LocationsFields } from '@/components/booking/locations-fields'
import { useBookingStore } from '@/store/booking-store'

const useAuthMock = vi.fn()
const useProfileMock = vi.fn()
const useVehiclesMock = vi.fn()

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => useProfileMock(),
}))

vi.mock('@/hooks/use-vehicles', () => ({
  useVehicles: () => useVehiclesMock(),
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
    window.localStorage.clear()

    useAuthMock.mockReturnValue({ user: null })
    useProfileMock.mockReturnValue({ data: undefined })
    useVehiclesMock.mockReturnValue({ data: [], isLoading: false })
    useBookingStore.getState().reset()
  })

  it('lets customers enter pickup and drop-off time separately from the date', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Pick-up Date/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/Pick-up Time/i), { target: { value: '09:30' } })
    fireEvent.change(screen.getByLabelText(/Drop-off Date/i), { target: { value: '2026-08-03' } })
    fireEvent.change(screen.getByLabelText(/Drop-off Time/i), { target: { value: '17:45' } })

    expect(JSON.parse(window.localStorage.getItem('booking-date-selection') || '{}')).toEqual({
      start: '2026-08-01T09:30',
      end: '2026-08-03T17:45',
    })
  })

  it('auto-fills drop-off to 24 hours after the pickup date and time', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Pick-up Date/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/Pick-up Time/i), { target: { value: '09:30' } })

    expect(screen.getByLabelText(/Drop-off Date/i)).toHaveValue('2026-08-02')
    expect(screen.getByLabelText(/Drop-off Time/i)).toHaveValue('09:30')
    expect(JSON.parse(window.localStorage.getItem('booking-date-selection') || '{}')).toEqual({
      start: '2026-08-01T09:30',
      end: '2026-08-02T09:30',
    })
  })

  it('shows the applied filters text after clicking Find a Car', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP LOCATION/i), { target: { value: 'Makati' } })
    fireEvent.change(screen.getByLabelText(/Pick-up Date/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/Pick-up Time/i), { target: { value: '09:30' } })
    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    expect(screen.getByText(/Showing results for:/)).toBeInTheDocument()
    expect(screen.getByText('Pick up:')).toBeInTheDocument()
    expect(screen.getByText('Makati, August 1, 2026 9:30 AM')).toBeInTheDocument()
    expect(screen.getByText('Drop off:')).toBeInTheDocument()
    expect(screen.getByText('Makati, August 2, 2026 9:30 AM')).toBeInTheDocument()
  })

  it('persists pickup and return locations into the booking store for the booking page', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP LOCATION/i), { target: { value: 'Makati City' } })
    fireEvent.click(screen.getByLabelText(/Return to a different location/i))
    fireEvent.change(screen.getByLabelText(/DROP-OFF LOCATION/i), { target: { value: 'NAIA Terminal 3' } })
    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    expect(useBookingStore.getState().locations).toMatchObject({
      pickup: 'Makati City',
      dropoff: 'NAIA Terminal 3',
    })

    render(
      <MemoryRouter initialEntries={['/dashboard/book/vehicle-1?type=self-drive']}>
        <LocationsFields />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/Pick-up \/ Delivery Location/i)).toHaveValue('Makati City')
    expect(screen.getByLabelText(/Drop-off \/ Return Location/i)).toHaveValue('NAIA Terminal 3')
  })

  it('uses the pickup location as the return location when a different return point is not selected', () => {
    render(
      <MemoryRouter>
        <OurFleet />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/PICK-UP LOCATION/i), { target: { value: 'BGC' } })
    fireEvent.click(screen.getByRole('button', { name: /Find a Car/i }))

    expect(useBookingStore.getState().locations).toMatchObject({
      pickup: 'BGC',
      dropoff: 'BGC',
    })
  })
})
