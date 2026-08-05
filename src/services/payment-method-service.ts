import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types/payment'

export async function getActivePaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true)
  return (data || []) as PaymentMethod[]
}

export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await supabase.from('payment_methods').select('*').order('created_at', { ascending: true })
  return (data || []) as PaymentMethod[]
}

export async function createPaymentMethod(method: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentMethod> {
  const { data, error } = await supabase.from('payment_methods').insert(method).select().single()
  if (error) throw error
  return data as PaymentMethod
}

export async function updatePaymentMethod(id: string, method: Partial<Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const { error } = await supabase.from('payment_methods').update(method).eq('id', id)
  if (error) throw error
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.from('payment_methods').delete().eq('id', id)
  if (error) throw error
}
