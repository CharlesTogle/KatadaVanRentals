import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useVatPercent() {
  const [vatPercent, setVatPercent] = useState(0)

  useEffect(() => {
    try {
      supabase
        .from('app_settings')
        .select('vat_percent')
        .single()
        .then(
          ({ data }) => setVatPercent(Math.max(0, Number(data?.vat_percent ?? 0))),
          () => undefined,
        )
    } catch {
      // Keep the default when settings are unavailable.
    }
  }, [])

  return vatPercent
}
