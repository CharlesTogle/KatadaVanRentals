import { create } from 'zustand'

type Profile = {
  first_name: string
  last_name: string
  email: string
  mobile: string
}

type Address = {
  address: string
  city: string
  province: string
  zip: string
  country: string
}

type Locations = {
  pickup: string
  dropoff: string
  destination: string
}

type Payment = {
  method: string
  amount: string
  reference: string
}

type BookingState = {
  mode: 'dropoff' | 'keep'
  profile: Profile
  address: Address
  locations: Locations
  purpose: string
  notes: string
  payment: Payment
  receiptFile: File | null
  submitting: boolean
  error: string

  setMode: (mode: 'dropoff' | 'keep') => void
  setProfile: (profile: Partial<Profile>) => void
  setAddress: (address: Partial<Address>) => void
  setLocations: (locations: Partial<Locations>) => void
  setPurpose: (purpose: string) => void
  setNotes: (notes: string) => void
  setPayment: (payment: Partial<Payment>) => void
  setReceiptFile: (file: File | null) => void
  setSubmitting: (submitting: boolean) => void
  setError: (error: string) => void
  reset: () => void
}

const defaults = {
  mode: 'dropoff' as const,
  profile: { first_name: '', last_name: '', email: '', mobile: '+63 ' },
  address: { address: '', city: '', province: '', zip: '', country: 'Philippines' },
  locations: { pickup: '', dropoff: '', destination: '' },
  purpose: '',
  notes: '',
  payment: { method: '', amount: '', reference: '' },
  receiptFile: null,
  submitting: false,
  error: '',
}

export const useBookingStore = create<BookingState>((set) => ({
  ...defaults,

  setMode: (mode) => set({ mode }),
  setProfile: (profile) => set((s) => ({ profile: { ...s.profile, ...profile } })),
  setAddress: (address) => set((s) => ({ address: { ...s.address, ...address } })),
  setLocations: (locations) => set((s) => ({ locations: { ...s.locations, ...locations } })),
  setPurpose: (purpose) => set({ purpose }),
  setNotes: (notes) => set({ notes }),
  setPayment: (payment) => set((s) => ({ payment: { ...s.payment, ...payment } })),
  setReceiptFile: (receiptFile) => set({ receiptFile }),
  setSubmitting: (submitting) => set({ submitting }),
  setError: (error) => set({ error }),
  reset: () => set(defaults),
}))
