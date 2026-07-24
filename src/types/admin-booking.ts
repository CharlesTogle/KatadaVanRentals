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
  totalAmount: number
}
