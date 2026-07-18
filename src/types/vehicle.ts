export interface Vehicle {
  id: string
  name: string
  slug: string
  plate_number: string
  brand_id: string
  vehicle_type_id: string
  description: string | null
  passenger_count: number
  bag_count: number
  transmission: string | null
  fuel_type: string | null
  base_price_per_day: number
  driver_rate_per_day: number
  km_per_liter: number | null
  supports_all_in: boolean
  supports_all_out: boolean
  supports_self_drive: boolean
  supports_pickup_dropoff: boolean
  is_available: boolean
  image_paths: string[]
  created_at: string
  updated_at: string
}
