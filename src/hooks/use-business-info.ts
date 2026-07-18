import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface BusinessInfo {
  support_email: string
  support_phone: string
  business_address: string
  city: string
  province: string
}

const defaults: BusinessInfo = {
  support_email: 'tadsuu@gmail.com',
  support_phone: '+63 906 496 1248',
  business_address: '11th 12th St., Villamor, Pasay City, Metro Manila',
  city: 'Pasay City',
  province: 'Metro Manila',
}

export function useBusinessInfo(): BusinessInfo {
  const { data } = useQuery({
    queryKey: ['app-settings', 'business-info'],
    queryFn: async () => {
      const { data: row } = await supabase.from('app_settings').select('support_email,support_phone,business_address,city,province').limit(1).single()
      return row
        ? {
            support_email: row.support_email || defaults.support_email,
            support_phone: row.support_phone || defaults.support_phone,
            business_address: row.business_address || defaults.business_address,
            city: row.city || defaults.city,
            province: row.province || defaults.province,
          }
        : defaults
    },
  })
  return data ?? defaults
}
