import { describe, it, expect, beforeEach } from 'vitest'
import { useBookingStore } from '@/store/booking-store'

describe('useBookingStore', () => {
  beforeEach(() => {
    useBookingStore.getState().reset()
  })

  it('initializes with default values', () => {
    const s = useBookingStore.getState()
    expect(s.mode).toBe('dropoff')
    expect(s.profile.first_name).toBe('')
    expect(s.profile.mobile).toBe('+63 ')
    expect(s.address.country).toBe('Philippines')
    expect(s.submitting).toBe(false)
    expect(s.error).toBe('')
  })

  it('setMode updates mode', () => {
    useBookingStore.getState().setMode('keep')
    expect(useBookingStore.getState().mode).toBe('keep')
  })

  it('setProfile merges partial data', () => {
    useBookingStore.getState().setProfile({ first_name: 'Jane' })
    const s = useBookingStore.getState()
    expect(s.profile.first_name).toBe('Jane')
    expect(s.profile.last_name).toBe('') // not overridden
  })

  it('setAddress merges partial data', () => {
    useBookingStore.getState().setAddress({ city: 'Pasay', province: 'Metro Manila' })
    const s = useBookingStore.getState()
    expect(s.address.city).toBe('Pasay')
    expect(s.address.province).toBe('Metro Manila')
    expect(s.address.country).toBe('Philippines') // not overridden
  })

  it('setPurpose updates purpose', () => {
    useBookingStore.getState().setPurpose('Leisure/Vacation')
    expect(useBookingStore.getState().purpose).toBe('Leisure/Vacation')
  })

  it('setSubmitting toggles submitting flag', () => {
    useBookingStore.getState().setSubmitting(true)
    expect(useBookingStore.getState().submitting).toBe(true)
    useBookingStore.getState().setSubmitting(false)
    expect(useBookingStore.getState().submitting).toBe(false)
  })

  it('setError sets and can clear error', () => {
    useBookingStore.getState().setError('Something failed')
    expect(useBookingStore.getState().error).toBe('Something failed')
  })

  it('setReceiptFile sets file', () => {
    const file = new File(['test'], 'receipt.png', { type: 'image/png' })
    useBookingStore.getState().setReceiptFile(file)
    expect(useBookingStore.getState().receiptFile).toBe(file)
    useBookingStore.getState().setReceiptFile(null)
    expect(useBookingStore.getState().receiptFile).toBeNull()
  })

  it('reset restores all defaults', () => {
    useBookingStore.getState().setProfile({ first_name: 'John' })
    useBookingStore.getState().setPurpose('Business')
    useBookingStore.getState().setError('error')
    useBookingStore.getState().setSubmitting(true)
    useBookingStore.getState().reset()

    const s = useBookingStore.getState()
    expect(s.profile.first_name).toBe('')
    expect(s.purpose).toBe('')
    expect(s.error).toBe('')
    expect(s.submitting).toBe(false)
  })
})
