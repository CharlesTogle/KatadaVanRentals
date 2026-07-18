import { useQuery } from '@tanstack/react-query'
import * as vehicleService from '@/services/vehicle-service'

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
