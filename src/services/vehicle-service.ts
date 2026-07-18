import { supabase } from '@/lib/supabase'
import type { Vehicle } from '@/types/vehicle'

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
