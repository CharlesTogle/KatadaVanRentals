export type AccountRole = 'customer' | 'admin' | 'manager' | 'staff'

export interface Profile {
  id: string
  role: AccountRole
  first_name: string | null
  last_name: string | null
  email: string
  mobile: string | null
  address_line_1: string | null
  address_line_2: string | null
  street_address: string | null
  barangay: string | null
  address: string | null
  city: string | null
  province: string | null
  zip_code: string | null
  country: string
  profile_image_path: string | null
  onboarding_completed: boolean
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}
