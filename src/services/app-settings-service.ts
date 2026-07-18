import { supabase } from '@/lib/supabase'

export interface AppSettings {
  business_name: string
  support_email: string
  support_phone: string
  business_address: string
  city: string
  province: string
  zip_code: string
  country: string
  tin_number: string
  vat_percent: number
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data } = await supabase.from('app_settings').select('*').limit(1).single()
  return data as AppSettings | null
}

export async function upsertAppSettings(settings: AppSettings): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({ id: true, ...settings })
  if (error) throw error
}
