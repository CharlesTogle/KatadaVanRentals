export interface Vehicle {
  id: string
  name: string
  slug: string
  plate_number: string
  year: number | null
  brand_id: string | null
  vehicle_type_id: string | null
  description: string | null
  passenger_count: number
  bag_count: number
  transmission: string | null
  fuel_type: string | null
  base_price_per_day: number
  excess_rate_per_hour: number
  auto_full_day_after_hours: number
  twelve_hour_rate: number | null
  driver_rate_per_day: number
  car_wash_fee: number
  delivery_fee: number
  security_deposit: number
  discount: number
  km_per_liter: number | null
  supports_all_in: boolean
  supports_all_out: boolean
  supports_self_drive: boolean
  supports_pickup_dropoff: boolean
  is_available: boolean
  meta_title: string | null
  meta_description: string | null
  image_paths: string[]
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  name: string
  created_at: string
}

export interface VehicleType {
  id: string
  name: string
  created_at: string
}

export interface CreateVehicleInput {
  name: string
  slug?: string
  plate_number: string
  year?: number | null
  brand_id?: string | null
  vehicle_type_id?: string | null
  description?: string | null
  passenger_count: number
  bag_count: number
  transmission?: string | null
  fuel_type?: string | null
  base_price_per_day: number
  excess_rate_per_hour?: number
  auto_full_day_after_hours?: number
  twelve_hour_rate?: number | null
  driver_rate_per_day: number
  car_wash_fee?: number
  delivery_fee?: number
  security_deposit?: number
  discount?: number
  km_per_liter?: number | null
  supports_all_in?: boolean
  supports_all_out?: boolean
  supports_self_drive?: boolean
  supports_pickup_dropoff?: boolean
  is_available?: boolean
  meta_title?: string | null
  meta_description?: string | null
  image_paths?: string[]
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>
