import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as bookingService from '@/services/booking-service'

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingService.getBookingById(id!),
    enabled: !!id,
  })
}

export function useAdminBookings(params: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'bookings', params.status, params.search],
    queryFn: () => bookingService.getAdminBookings(params),
  })
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { bRes, pRes, rbRes, vRes } = await bookingService.getAdminDashboardData()
      return { bRes, pRes, rbRes, vRes }
    },
  })
}

export function useInsertBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof bookingService.getAdminBookings>[0]) => bookingService.getAdminBookings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
    },
  })
}
