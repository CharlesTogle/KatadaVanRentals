import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types/payment'

export async function getActivePaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true)
  return (data || []) as PaymentMethod[]
}
