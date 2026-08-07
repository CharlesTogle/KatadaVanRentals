import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LocationSelector } from '@/components/booking/location-selector'

const suggestLocationsMock = vi.fn()

vi.mock('@/services/location-service', () => ({
  suggestLocations: (query: string) => suggestLocationsMock(query),
}))

function LocationSelectorHarness() {
  const [value, setValue] = useState('')

  return (
    <>
      <button type="button" onClick={() => setValue('Makati')}>Set Makati</button>
      <LocationSelector
        id="pickup"
        label="Pickup"
        value={value}
        placeholder="Where to deliver?"
        onChange={setValue}
        onSelect={() => {}}
      />
    </>
  )
}

describe('LocationSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    suggestLocationsMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    suggestLocationsMock.mockReset()
  })

  it('does not query suggestions when the value changes while unfocused', async () => {
    render(<LocationSelectorHarness />)

    fireEvent.click(screen.getByRole('button', { name: /Set Makati/i }))
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(suggestLocationsMock).not.toHaveBeenCalled()

    fireEvent.focus(screen.getByLabelText(/Pickup/i))
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(suggestLocationsMock).toHaveBeenCalledWith('Makati')
  })

  it('shows named places returned by the geocoder', async () => {
    suggestLocationsMock.mockResolvedValueOnce([{
      id: 'mall-of-asia',
      label: 'Pasay, Metro Manila, Philippines',
      address: 'Pasay, Metro Manila, Philippines',
      lat: 14.535,
      lng: 120.982,
    }])

    render(<LocationSelectorHarness />)
    const input = screen.getByLabelText(/Pickup/i)

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Mall of Asia' } })
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(screen.getByRole('button', { name: /Pasay, Metro Manila/i })).toBeInTheDocument()
  })
})
