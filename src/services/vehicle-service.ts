import { supabase } from '@/lib/supabase'
import type { Brand, CreateVehicleInput, UpdateVehicleInput, Vehicle, VehicleType } from '@/types/vehicle'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function vehiclePayload(input: CreateVehicleInput) {
  return {
    name: input.name,
    slug: input.slug ? slugify(input.slug) : slugify(input.name),
    plate_number: input.plate_number,
    year: input.year || null,
    brand_id: input.brand_id || null,
    vehicle_type_id: input.vehicle_type_id || null,
    description: input.description || null,
    passenger_count: input.passenger_count,
    bag_count: input.bag_count,
    transmission: input.transmission || null,
    fuel_type: input.fuel_type || null,
    base_price_per_day: input.base_price_per_day,
    excess_rate_per_hour: input.excess_rate_per_hour ?? 0,
    auto_full_day_after_hours: input.auto_full_day_after_hours ?? 12,
    twelve_hour_rate: input.twelve_hour_rate || null,
    driver_rate_per_day: input.driver_rate_per_day,
    car_wash_fee: input.car_wash_fee ?? 0,
    delivery_fee: input.delivery_fee ?? 0,
    security_deposit: input.security_deposit ?? 0,
    discount: input.discount ?? 0,
    km_per_liter: input.km_per_liter || null,
    supports_all_in: input.supports_all_in ?? true,
    supports_all_out: input.supports_all_out ?? true,
    supports_self_drive: input.supports_self_drive ?? true,
    supports_pickup_dropoff: input.supports_pickup_dropoff ?? true,
    is_available: input.is_available ?? true,
    meta_title: input.meta_title || null,
    meta_description: input.meta_description || null,
    image_paths: input.image_paths || [],
  }
}

export async function getAvailableVehicles(): Promise<Vehicle[]> {
  const { data } = await supabase.from('vehicles').select('*').eq('is_available', true)
  return (data || []) as Vehicle[]
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('slug', slug).single()
  if (error) throw error
  return data as Vehicle
}

export async function getVehicleById(id: string): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single()
  if (error) throw error
  return data as Vehicle
}

export async function getAdminVehicles(): Promise<Vehicle[]> {
  const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
  return (data || []) as Vehicle[]
}

export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehiclePayload(input))
    .select()
    .single()
  if (error) throw error
  return data as Vehicle
}

export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(vehiclePayload(input as CreateVehicleInput))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Vehicle
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) throw error
}

export async function uploadVehicleImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${ext}`
  const { data, error } = await supabase.storage.from('vehicles').upload(fileName, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from('vehicles').getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function getBrands(): Promise<Brand[]> {
  const { data } = await supabase.from('brands').select('*').order('name')
  return (data || []) as Brand[]
}

export async function getVehicleTypes(): Promise<VehicleType[]> {
  const { data } = await supabase.from('vehicle_types').select('*').order('name')
  return (data || []) as VehicleType[]
}
