export type RentalModel = 'all_in' | 'all_out' | 'self_drive'
export type BookingStatus =
  | 'for_review'
  | 'awaiting_documents'
  | 'pending_price_approval'
  | 'confirmed'
  | 'rejected'
  | 'canceled'
  | 'on_trip'
  | 'completed'

export interface Booking {
  id: string
  booking_number: string
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_mobile: string | null
  vehicle_id: string
  rental_model: RentalModel
  status: BookingStatus
  start_at: string
  end_at: string | null
  duration_days: number
  pickup_location: string | null
  dropoff_location: string | null
  destination: string | null
  purpose_of_travel: string | null
  notes: string | null
  distance_km: number | null
  duration_minutes: number | null
  toll_estimate_amount: number
  toll_segments: unknown[]
  fuel_estimate_liters: number
  fuel_estimate_amount: number
  delivery_fee: number
  recovery_fee: number
  discount_amount: number
  deposit_amount: number
  subtotal_amount: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  price_line_items: PriceLineItem[]
  idempotency_key: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  canceled_at?: string | null
  completed_at?: string | null
}

export interface PriceLineItem {
  label: string
  detail: string
  amount: number
}
