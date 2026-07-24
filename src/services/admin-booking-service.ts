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
      startAt: input.startAt,
      endAt: input.endAt,
      pickupLocation: input.pickupLocation || undefined,
      dropoffLocation: input.dropoffLocation || undefined,
      depositAmount: input.depositAmount ? Number(input.depositAmount) : undefined,
    },
  })

  if (error) {
    const err = new Error(error.message) as Error & { status?: number }
    err.status = error.context?.status
    throw err
  }

  return data as AdminBookingCreateResult
}
