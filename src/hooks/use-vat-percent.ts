import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logError, getRequestId } from '@/lib/logger'

export function useVatPercent() {
  const [vatPercent, setVatPercent] = useState(0)

  useEffect(() => {
    try {
      supabase
        .from('app_settings')
        .select('tax_mode')
        .single()
        .then(
          ({ data }) => setVatPercent(data?.tax_mode === 'vat' ? 12 : data?.tax_mode === 'percentage_tax' ? 3 : 0),
          (error) => logError('settings', 'Failed to load VAT settings', error, { requestId: getRequestId() }),
        )
    } catch (error) {
      logError('settings', 'Failed to load VAT settings', error, { requestId: getRequestId() })
      // Keep the default when settings are unavailable.
    }
  }, [])

  return vatPercent
}
