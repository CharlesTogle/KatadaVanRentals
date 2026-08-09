import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DateTimePicker } from '@/components/ui/date-time-picker'

describe('DateTimePicker', () => {
  it('disables unavailable calendar days without disabling adjacent days', async () => {
    render(
      <DateTimePicker
        id="booking-start-at"
        label="Pick-up Date & Time"
        value=""
        placeholder="Select date & time"
        onChange={() => undefined}
        disabledDates={[new Date(2026, 7, 12)]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select date & time' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /August 12th, 2026/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /August 13th, 2026/i })).not.toBeDisabled()
    })
  })

  it('clears the selected date and time', () => {
    const onChange = vi.fn()

    render(
      <DateTimePicker
        id="booking-start-at"
        label="Pick-up Date & Time"
        value="2026-08-12T09:00"
        placeholder="Select date & time"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear date and time' }))

    expect(onChange).toHaveBeenCalledWith('')
  })
})
