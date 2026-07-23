import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as vehicleService from '@/services/vehicle-service'
import type { CreateVehicleInput, UpdateVehicleInput } from '@/types/vehicle'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles', 'available'],
    queryFn: vehicleService.getAvailableVehicles,
  })
}

export function useVehicleBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', slug],
    queryFn: () => vehicleService.getVehicleBySlug(slug!),
    enabled: !!slug,
  })
}

export function useVehicleById(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getVehicleById(id!),
    enabled: !!id,
  })
}

export function useAdminVehicles() {
  return useQuery({
    queryKey: ['admin', 'fleet'],
    queryFn: vehicleService.getAdminVehicles,
  })
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: vehicleService.getBrands,
    staleTime: Infinity,
  })
}

export function useVehicleTypes() {
  return useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: vehicleService.getVehicleTypes,
    staleTime: Infinity,
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => vehicleService.createVehicle(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'fleet'] })
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleInput }) =>
      vehicleService.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'fleet'] })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vehicleService.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'fleet'] })
    },
  })
}
