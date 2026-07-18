import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAppSettings, upsertAppSettings } from '@/services/app-settings-service'

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: getAppSettings,
  })
}

export function useUpsertAppSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertAppSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] })
    },
  })
}
