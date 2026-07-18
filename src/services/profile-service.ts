import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(data).eq('id', id)
  if (error) throw error
}

export async function getAdminCustomers(search?: string) {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  const { data } = await query
  return (data || []) as Profile[]
}
