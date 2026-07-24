import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/profile'
import type { AdminCustomerRow } from '@/types/admin-customer'
import type { AdminCustomerSearchPage } from '@/types/admin-booking'

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(data).eq('id', id)
  if (error) throw error
}

export async function searchAdminCustomers(search?: string): Promise<AdminCustomerRow[]> {
  const { data, error } = await supabase.rpc('search_admin_customers', { search_query: search || null })
  if (error) throw error
  return (data || []) as AdminCustomerRow[]
}

export async function paginateAdminCustomers(params: { query?: string; offset: number; limit: number }): Promise<AdminCustomerSearchPage> {
  let query = supabase
    .from('profiles')
    .select('id,first_name,last_name,email,mobile', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1)

  if (params.query) {
    query = query.or(`first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,email.ilike.%${params.query}%`)
  }

  const { data, count, error } = await query
  if (error) throw error

  const nextOffset = count !== null && params.offset + params.limit < count
    ? params.offset + params.limit
    : null

  return { items: (data || []) as AdminCustomerSearchPage['items'], nextOffset }
}

export async function deactivateCustomer(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_set_customer_active', { target_customer_id: id, active: false })
  if (error) throw error
}

export async function reactivateCustomer(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_set_customer_active', { target_customer_id: id, active: true })
  if (error) throw error
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-delete-customer', { body: { customerId: id } })
  if (error) throw error
}
