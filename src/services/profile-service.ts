import { supabase } from '@/lib/supabase'
import { hasRequiredSelfDriveDocuments } from '@/lib/booking-utils'
import type { Profile } from '@/types/profile'
import type { AdminCustomerRow } from '@/types/admin-customer'
import type { AdminCustomerSearchPage } from '@/types/admin-booking'
import type { CustomerDocument } from '@/types/document'

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
    .eq('role', 'customer')
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

  const customerIds = (data || []).map((item) => item.id)
  let documentsByCustomerId = new Map<string, CustomerDocument[]>()

  if (customerIds.length) {
    const { data: documents, error: documentsError } = await supabase
      .from('customer_documents')
      .select('customer_id,document_type,status,file_path')
      .in('customer_id', customerIds)

    if (documentsError) throw documentsError

    documentsByCustomerId = (documents || []).reduce((map, document) => {
      const customerDocuments = map.get(document.customer_id) || []
      customerDocuments.push(document as CustomerDocument)
      map.set(document.customer_id, customerDocuments)
      return map
    }, new Map<string, CustomerDocument[]>())
  }

  return {
    items: (data || []).map((item) => ({
      id: item.id,
      first_name: item.first_name,
      last_name: item.last_name,
      email: item.email,
      mobile: item.mobile,
      hasRequiredSelfDriveDocuments: hasRequiredSelfDriveDocuments(documentsByCustomerId.get(item.id) || []),
    })) as AdminCustomerSearchPage['items'],
    nextOffset,
  }
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
