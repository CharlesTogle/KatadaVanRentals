import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getServiceAreas, createServiceArea, updateServiceArea, deleteServiceArea } from '@/services/service-area-service'

export function useServiceAreas() {
  return useQuery({
    queryKey: ['service-areas'],
    queryFn: getServiceAreas,
  })
}

export function useCreateServiceArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createServiceArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] })
    },
  })
}

export function useUpdateServiceArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; label?: string; address?: string; lat?: number | null; lng?: number | null; radius_km?: number; is_active?: boolean }) =>
      updateServiceArea(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] })
    },
  })
}

export function useDeleteServiceArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteServiceArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] })
    },
  })
}
