export type PaymentChannel = 'cash' | 'bank_transfer' | 'ewallet' | 'online_gateway'
export type PaymentStatus = 'pending' | 'submitted' | 'verified' | 'rejected' | 'refunded'

export interface PaymentMethod {
  id: string
  channel: PaymentChannel
  provider: string
  branch: string | null
  account_number: string | null
  account_name: string | null
  account_type: string | null
  currency: string
  instructions: string | null
  qr_image_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  booking_id: string
  payment_method_id: string | null
  channel: PaymentChannel
  status: PaymentStatus
  amount: number
  reference_number: string | null
  receipt_path: string | null
  paid_at: string | null
  submitted_by: string | null
  verified_by: string | null
  verified_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}
