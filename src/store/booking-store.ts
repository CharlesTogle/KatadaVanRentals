import { create } from 'zustand'
import type { RouteQuoteResponse, SelectedLocation, TollPlazaOption, TollRfidBreakdownItem } from '@/types/location'

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

type RouteSelections = {
  pickup: SelectedLocation
  destination: SelectedLocation
  dropoff: SelectedLocation
}

type TollSelections = {
  entryCandidates: TollPlazaOption[]
  exitCandidates: TollPlazaOption[]
  entry: TollPlazaOption | null
  exit: TollPlazaOption | null
  vehicleClass: 1 | 2 | 3
  rfidBreakdown: TollRfidBreakdownItem[]
}

type Payment = {
  method: string
  amount: string
  reference: string
}

type BookingState = {
  mode: 'dropoff' | 'keep'
  returnDifferentLocation: boolean
  profile: Profile
  address: Address
  locations: Locations
  purpose: string
  notes: string
  payment: Payment
  routeSelections: RouteSelections
  tollSelections: TollSelections
  routeQuote: RouteQuoteResponse | null
  receiptFile: File | null
  submitting: boolean
  error: string

  setMode: (mode: 'dropoff' | 'keep') => void
  setReturnDifferentLocation: (checked: boolean) => void
  setProfile: (profile: Partial<Profile>) => void
  setAddress: (address: Partial<Address>) => void
  setLocations: (locations: Partial<Locations>) => void
  setPurpose: (purpose: string) => void
  setNotes: (notes: string) => void
  setPayment: (payment: Partial<Payment>) => void
  setRouteSelection: (field: keyof RouteSelections, selection: SelectedLocation) => void
  setTollCandidates: (entryCandidates: TollPlazaOption[], exitCandidates: TollPlazaOption[]) => void
  setTollSelection: (field: 'entry' | 'exit', selection: TollPlazaOption | null) => void
  setTollRfidBreakdown: (rfidBreakdown: TollRfidBreakdownItem[]) => void
  setRouteQuote: (routeQuote: RouteQuoteResponse | null) => void
  setReceiptFile: (file: File | null) => void
  setSubmitting: (submitting: boolean) => void
  setError: (error: string) => void
  reset: () => void
}

const defaults = {
  mode: 'dropoff' as const,
  returnDifferentLocation: false,
  profile: { first_name: '', last_name: '', email: '', mobile: '+63 ' },
  address: { address: '', city: '', province: '', zip: '', country: 'Philippines' },
  locations: { pickup: '', dropoff: '', destination: '' },
  purpose: '',
  notes: '',
  payment: { method: '', amount: '', reference: '' },
  routeSelections: {
    pickup: { address: '', lat: null, lng: null },
    destination: { address: '', lat: null, lng: null },
    dropoff: { address: '', lat: null, lng: null },
  },
  tollSelections: {
    entryCandidates: [],
    exitCandidates: [],
    entry: null,
    exit: null,
    vehicleClass: 1 as const,
    rfidBreakdown: [],
  },
  routeQuote: null,
  receiptFile: null,
  submitting: false,
  error: '',
}

export const useBookingStore = create<BookingState>((set) => ({
  ...defaults,

  setMode: (mode) => set({ mode }),
  setReturnDifferentLocation: (returnDifferentLocation) => set({ returnDifferentLocation }),
  setProfile: (profile) => set((s) => ({ profile: { ...s.profile, ...profile } })),
  setAddress: (address) => set((s) => ({ address: { ...s.address, ...address } })),
  setLocations: (locations) => set((s) => ({
    locations: { ...s.locations, ...locations },
    routeQuote: Object.keys(locations).some((key) => key === 'pickup' || key === 'destination' || key === 'dropoff') ? null : s.routeQuote,
    tollSelections: Object.keys(locations).some((key) => key === 'pickup' || key === 'destination' || key === 'dropoff')
      ? { ...defaults.tollSelections }
      : s.tollSelections,
  })),
  setPurpose: (purpose) => set({ purpose }),
  setNotes: (notes) => set({ notes }),
  setPayment: (payment) => set((s) => ({ payment: { ...s.payment, ...payment } })),
  setRouteSelection: (field, selection) => set((s) => ({
    routeSelections: { ...s.routeSelections, [field]: selection },
    tollSelections: { ...defaults.tollSelections },
    routeQuote: null,
  })),
  setTollCandidates: (entryCandidates, exitCandidates) => set((s) => ({
    tollSelections: {
      ...s.tollSelections,
      entryCandidates,
      exitCandidates,
      entry: entryCandidates.find((candidate) => candidate.id === s.tollSelections.entry?.id) ?? entryCandidates[0] ?? null,
      exit: exitCandidates.find((candidate) => candidate.id === s.tollSelections.exit?.id) ?? exitCandidates[0] ?? null,
      rfidBreakdown: [],
    },
    routeQuote: s.routeQuote
      ? {
          ...s.routeQuote,
          tollEstimateAmount: 0,
          tollSegments: [],
          tollEntryPlaza: null,
          tollEntryExpressway: null,
          tollExitPlaza: null,
          tollExitExpressway: null,
          tollRfidBreakdown: [],
        }
      : null,
  })),
  setTollSelection: (field, selection) => set((s) => ({
    tollSelections: {
      ...s.tollSelections,
      [field]: selection,
      rfidBreakdown: [],
    },
    routeQuote: s.routeQuote
      ? {
          ...s.routeQuote,
          tollEstimateAmount: 0,
          tollSegments: [],
          tollEntryPlaza: field === 'entry' ? selection?.name ?? null : s.routeQuote.tollEntryPlaza,
          tollEntryExpressway: field === 'entry' ? selection?.expressway ?? null : s.routeQuote.tollEntryExpressway,
          tollExitPlaza: field === 'exit' ? selection?.name ?? null : s.routeQuote.tollExitPlaza,
          tollExitExpressway: field === 'exit' ? selection?.expressway ?? null : s.routeQuote.tollExitExpressway,
          tollRfidBreakdown: [],
        }
      : null,
  })),
  setTollRfidBreakdown: (rfidBreakdown) => set((s) => ({
    tollSelections: { ...s.tollSelections, rfidBreakdown },
  })),
  setRouteQuote: (routeQuote) => set({ routeQuote }),
  setReceiptFile: (receiptFile) => set({ receiptFile }),
  setSubmitting: (submitting) => set({ submitting }),
  setError: (error) => set({ error }),
  reset: () => set(defaults),
}))
