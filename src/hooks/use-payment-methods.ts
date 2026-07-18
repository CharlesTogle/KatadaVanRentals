import { useQuery } from '@tanstack/react-query'
import * as paymentMethodService from '@/services/payment-method-service'

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods', 'active'],
    queryFn: paymentMethodService.getActivePaymentMethods,
  })
}
