import { supabase } from '@/lib/supabase'
import type { AdminBookingCreateInput, AdminBookingCreateResult } from '@/types/admin-booking'

export async function createAdminBooking(input: AdminBookingCreateInput): Promise<AdminBookingCreateResult> {
  const { data, error } = await supabase.functions.invoke('admin-create-booking', {
    body: {
      customerMode: input.customerMode,
      existingCustomerId: input.existingCustomerId ?? undefined,
      newCustomer: input.newCustomer
        ? {
            firstName: input.newCustomer.firstName,
            lastName: input.newCustomer.lastName,
            email: input.newCustomer.email,
            mobile: input.newCustomer.mobile || undefined,
            sendInvite: input.newCustomer.sendInvite,
          }
        : undefined,
      vehicleId: input.vehicleId,
      rentalModel: input.rentalModel,
      bookingMode: input.bookingMode,
      startAt: input.startAt,
      endAt: input.endAt ?? undefined,
      pickupLocation: input.pickupLocation || undefined,
      dropoffLocation: input.dropoffLocation || undefined,
      destination: input.destination || undefined,
      purposeOfTravel: input.purposeOfTravel || undefined,
      notes: input.notes || undefined,
      pickupLat: input.pickupLat ?? undefined,
      pickupLng: input.pickupLng ?? undefined,
      dropoffLat: input.dropoffLat ?? undefined,
      dropoffLng: input.dropoffLng ?? undefined,
      distanceKm: input.distanceKm ?? undefined,
      durationMinutes: input.durationMinutes ?? undefined,
      fuelEstimateLiters: input.fuelEstimateLiters,
      fuelEstimateAmount: input.fuelEstimateAmount,
      tollEstimateAmount: input.tollEstimateAmount,
      tollSegments: input.tollSegments,
      tollEntryPlaza: input.tollEntryPlaza ?? undefined,
      tollEntryExpressway: input.tollEntryExpressway ?? undefined,
      tollExitPlaza: input.tollExitPlaza ?? undefined,
      tollExitExpressway: input.tollExitExpressway ?? undefined,
      tollVehicleClass: input.tollVehicleClass,
      tollRfidBreakdown: input.tollRfidBreakdown,
      selfDriveAddress: input.selfDriveAddress ?? undefined,
    },
  })

  if (error) {
    const err = new Error(error.message) as Error & { status?: number }
    err.status = error.context?.status
    throw err
  }

  return data as AdminBookingCreateResult
}
