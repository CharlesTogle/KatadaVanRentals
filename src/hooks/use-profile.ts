import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as profileService from '@/services/profile-service'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileService.getProfile(userId!),
    enabled: !!userId,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ first_name: string; last_name: string; mobile: string; address: string; city: string; province: string; zip_code: string; country: string; profile_image_path: string | null }> }) =>
      profileService.updateProfile(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.id] })
    },
  })
}

export function useAdminCustomers(search?: string) {
  return useQuery({
    queryKey: ['admin', 'customers', search],
    queryFn: () => profileService.searchAdminCustomers(search),
  })
}
