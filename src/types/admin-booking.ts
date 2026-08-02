export interface AdminCustomerOption {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  mobile: string | null
}

export interface AdminCustomerSearchPage {
  items: AdminCustomerOption[]
  nextOffset: number | null
}

export interface AdminBookingCreateInput {
  customerMode: 'existing' | 'new'
  existingCustomerId: string | null
  newCustomer: {
    firstName: string
    lastName: string
    email: string
    mobile: string
    sendInvite: boolean
  } | null
  vehicleId: string
  rentalModel: 'all_out' | 'self_drive' | 'all_in'
  startAt: string
  endAt: string
  pickupLocation: string
  dropoffLocation: string
  depositAmount: string
  pickupLat: number | null
  pickupLng: number | null
  dropoffLat: number | null
  dropoffLng: number | null
  distanceKm: number | null
  durationMinutes: number | null
  fuelEstimateLiters: number
  fuelEstimateAmount: number
  tollEstimateAmount: number
  tollSegments: { name: string; amount: number; currency: string }[]
  tollEntryPlaza: string | null
  tollEntryExpressway: string | null
  tollExitPlaza: string | null
  tollExitExpressway: string | null
  tollVehicleClass: 1 | 2 | 3
  tollRfidBreakdown: { system: string; amount: number }[]
}

export interface AdminBookingCreateResult {
  bookingId: string
  bookingNumber: string
  customerId: string
  status: 'confirmed'
}

export interface AdminPricePreview {
  durationLabel: string
  baseAmount: number
  driverAmount: number
  fuelAmount: number
  tollAmount: number
  totalAmount: number
}
