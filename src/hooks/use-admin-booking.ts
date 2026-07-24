import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paginateAdminCustomers } from '@/services/profile-service'
import { createAdminBooking } from '@/services/admin-booking-service'

export function useAdminCustomerSearch(query: string) {
  return useInfiniteQuery({
    queryKey: ['admin', 'booking-create', 'customers', query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => paginateAdminCustomers({ query: query || undefined, offset: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })
}

export function useCreateAdminBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAdminBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}
