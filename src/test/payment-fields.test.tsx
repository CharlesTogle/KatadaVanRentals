import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PaymentFields } from '@/components/booking/payment-fields'
import { useBookingStore } from '@/store/booking-store'

vi.mock('@/hooks/use-payment-methods', () => ({
  usePaymentMethods: () => ({
    data: [
      { id: 'pm-1', provider: 'BDO', account_number: '1234', channel: 'bank_transfer' },
      { id: 'pm-2', provider: 'GCash', account_number: null, channel: 'ewallet' },
    ],
  }),
}))

describe('PaymentFields', () => {
  beforeEach(() => {
    useBookingStore.getState().reset()
  })

  it('prefills the first payment method when none is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/book/vehicle-1?type=self-drive']}>
        <PaymentFields depositAmount={8400} />
      </MemoryRouter>,
    )

    const select = document.querySelector('select') as HTMLSelectElement

    await waitFor(() => {
      expect(select.value).toBe('pm-1')
    })
  })

  it('stores the selected receipt file name', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/book/vehicle-1?type=self-drive']}>
        <PaymentFields depositAmount={8400} />
      </MemoryRouter>,
    )

    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument()
    })
  })

  it('shows the computed deposit amount', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/book/vehicle-1?type=with-driver']}>
        <PaymentFields depositAmount={8400} />
      </MemoryRouter>,
    )

    expect(screen.getByDisplayValue('₱ 8,400')).toBeInTheDocument()
  })
})
