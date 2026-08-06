import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
const email = process.env.TEST_EMAIL
const password = process.env.TEST_PASSWORD

test.describe('Booking availability API', () => {
  test('allows only one of two concurrent overlapping bookings', async () => {
    test.skip(
      !supabaseUrl || !anonKey || !serviceRoleKey || !email || !password,
      'Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_SUPABASE_SERVICE_ROLE_KEY, TEST_EMAIL, and TEST_PASSWORD',
    )

    const customer = createClient(supabaseUrl!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: signInError } = await customer.auth.signInWithPassword({ email: email!, password: password! })
    expect(signInError).toBeNull()

    const startAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    startAt.setMinutes(0, 0, 0)
    const endAt = new Date(startAt.getTime() + 2 * 24 * 60 * 60 * 1000)

    const { data: vehicles, error: vehicleError } = await admin
      .from('vehicles')
      .select('id')
      .eq('is_available', true)
    expect(vehicleError).toBeNull()
    expect(vehicles).not.toHaveLength(0)

    const { data: activeBookings, error: bookingsError } = await admin
      .from('bookings')
      .select('vehicle_id,start_at,end_at')
      .in('status', ['for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip'])
      .lt('start_at', endAt.toISOString())
    expect(bookingsError).toBeNull()

    const occupiedVehicleIds = new Set((activeBookings || [])
      .filter((booking) => booking.end_at === null || booking.end_at > startAt.toISOString())
      .map((booking) => booking.vehicle_id))
    const vehicle = vehicles?.find((candidate) => !occupiedVehicleIds.has(candidate.id))
    expect(vehicle, 'No available vehicle exists for the test window').toBeDefined()

    const bookingNumbers = [
      `E2E-RACE-${Date.now()}-A`,
      `E2E-RACE-${Date.now()}-B`,
    ]
    const createdBookingIds: string[] = []

    try {
      const results = await Promise.all(bookingNumbers.map((bookingNumber) => customer.rpc('create_booking', {
        p_booking_number: bookingNumber,
        p_vehicle_id: vehicle!.id,
        p_rental_model: 'all_out',
        p_start_at: startAt.toISOString(),
        p_end_at: endAt.toISOString(),
        p_duration_days: 2,
        p_idempotency_key: crypto.randomUUID(),
      })))

      for (const result of results) {
        if (result.data) createdBookingIds.push(result.data.id)
      }

      expect(results.filter((result) => result.data).length, results.map((result) => result.error?.message).join('; ')).toBe(1)
      expect(results.filter((result) => result.error).length).toBe(1)
      expect(results.find((result) => result.error)?.error?.message).toContain('Vehicle is not available')
    } finally {
      if (createdBookingIds.length > 0) {
        const { error } = await admin.from('bookings').delete().in('id', createdBookingIds)
        expect(error).toBeNull()
      }
    }
  })
})
