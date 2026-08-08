import { describe, expect, it } from 'vitest'
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
})
