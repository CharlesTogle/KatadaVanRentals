export interface AdminCustomerRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  mobile: string | null
  city: string | null
  province: string | null
  country: string | null
  joined_at: string
  last_login_at: string | null
  is_active: boolean
  bookings_count: number
  total_spend: number
}

export type AdminCustomerAccountAction = 'view_profile' | 'deactivate' | 'reactivate' | 'delete'
