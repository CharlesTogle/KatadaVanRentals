import { supabase } from '@/lib/supabase'
import type { ServiceArea } from '@/types/location'

export async function getServiceAreas(): Promise<ServiceArea[]> {
  const { data, error } = await supabase
    .from('service_points')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as ServiceArea[]
}

export async function createServiceArea(input: {
  label: string
  address: string
  lat: number | null
  lng: number | null
  radius_km: number
}): Promise<ServiceArea> {
  const { data, error } = await supabase
    .from('service_points')
    .insert({ ...input, is_active: true })
    .select()
    .single()

  if (error) throw error
  return data as ServiceArea
}

export async function updateServiceArea(
  id: string,
  input: Partial<{
    label: string
    address: string
    lat: number | null
    lng: number | null
    radius_km: number
    is_active: boolean
  }>,
): Promise<ServiceArea> {
  const { data, error } = await supabase
    .from('service_points')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ServiceArea
}

export async function deleteServiceArea(id: string): Promise<void> {
  const { error } = await supabase.from('service_points').delete().eq('id', id)
  if (error) throw error
}
