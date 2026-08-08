import { supabase } from '@/lib/supabase'
import type { CreateVehicleInput, UpdateVehicleInput, Vehicle, VehicleUnavailableRange } from '@/types/vehicle'

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
    brand: input.brand || null,
    vehicle_type: input.vehicle_type || null,
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
    security_deposit_type: input.security_deposit_type ?? 'fixed',
    km_per_liter: input.km_per_liter || null,
    peso_per_km: input.peso_per_km ?? 0,
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

export async function getVehicleUnavailableRanges(vehicleId: string): Promise<VehicleUnavailableRange[]> {
  const from = new Date()
  const to = new Date(from)
  to.setFullYear(to.getFullYear() + 2)
  const { data, error } = await supabase.rpc('get_vehicle_unavailable_ranges', {
    p_vehicle_id: vehicleId,
    p_from_at: from.toISOString(),
    p_to_at: to.toISOString(),
  })
  if (error) throw error
  return (data || []) as VehicleUnavailableRange[]
}

export async function getAvailableVehicleIds(startAt: string, endAt: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_available_vehicle_ids', {
    p_start_at: startAt,
    p_end_at: endAt,
  })
  if (error) throw error
  return (data || []).map(({ vehicle_id }: { vehicle_id: string }) => vehicle_id)
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
  const { data, error } = await supabase.storage.from('vehicle-images').upload(fileName, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(data.path)
  return urlData.publicUrl
}
