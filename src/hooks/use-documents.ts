import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as documentService from '@/services/document-service'

export function useCustomerDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['customer', 'documents', userId],
    queryFn: () => documentService.getCustomerDocuments(userId!),
    enabled: !!userId,
  })
}

export function useSaveCustomerDocument(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: documentService.saveCustomerDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'documents', userId] })
    },
  })
}

export function useDeleteCustomerDocument(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: documentService.deleteCustomerDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'documents', userId] })
    },
  })
}
