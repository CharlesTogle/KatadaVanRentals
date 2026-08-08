import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as bookingService from '@/services/booking-service'

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingService.getBookingById(id!),
    enabled: !!id,
  })
}

export function useAdminBookings(params: { status?: string; search?: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['admin', 'bookings', params.status, params.search, params.page, params.pageSize],
    queryFn: () => bookingService.getAdminBookings(params),
  })
}

export function useAdminFeedback() {
  return useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: () => bookingService.getAdminFeedback(),
  })
}

export function useSetFeedbackHomepageVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, displayOnHomepage }: { id: string; displayOnHomepage: boolean }) =>
      bookingService.setFeedbackHomepageVisibility(id, displayOnHomepage),
    onMutate: async ({ id, displayOnHomepage }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'feedback'] })
      const previousFeedback = queryClient.getQueryData<bookingService.AdminFeedbackRow[]>(['admin', 'feedback'])

      queryClient.setQueryData<bookingService.AdminFeedbackRow[]>(['admin', 'feedback'], (current) =>
        current?.map((entry) => entry.id === id ? { ...entry, display_on_homepage: displayOnHomepage } : entry),
      )

      return { previousFeedback }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFeedback) {
        queryClient.setQueryData(['admin', 'feedback'], context.previousFeedback)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })
}

export function useHomepageTestimonials() {
  return useQuery({
    queryKey: ['homepage', 'testimonials'],
    queryFn: bookingService.getHomepageTestimonials,
  })
}

export function useMyBookings(status?: string) {
  return useQuery({
    queryKey: ['customer', 'bookings', status],
    queryFn: () => bookingService.getMyBookings(status),
  })
}

export function useAdminBooking(bookingNumber: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'booking', bookingNumber],
    queryFn: () => bookingService.getAdminBookingByNumber(bookingNumber!),
    enabled: !!bookingNumber,
  })
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { bRes, pRes, vRes } = await bookingService.getAdminDashboardData()
      return { bRes, pRes, vRes }
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

export function useCancelOwnBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => bookingService.cancelOwnBooking(id, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useAcceptOwnPriceAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => bookingService.acceptOwnPriceAdjustment(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof bookingService.updateBookingStatus>[1] }) =>
      bookingService.updateBookingStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking', data.id] })
    },
  })
}

export function useDeleteBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => bookingService.deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useRevenueReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ['admin', 'revenue-report', from, to],
    queryFn: () => bookingService.getSubmittedPayments(from, to),
  })
}

export function useAdminBookingAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: bookingService.AdminBookingActionInput) => bookingService.runAdminBookingAction(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'booking'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] })
    },
  })
}
