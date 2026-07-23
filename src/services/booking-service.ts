import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types/booking'
import type { BookingStatus } from '@/types/booking'

export async function getBookingById(id: string): Promise<Booking> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single()
  if (error) throw error
  return data as Booking
}

export async function getMyBookings(status?: string) {
  let query = supabase
    .from('bookings')
    .select('id, booking_number, vehicle_id, start_at, end_at, duration_days, total_amount, paid_amount, remaining_amount, status, created_at, rental_model, vehicles!vehicle_id(name,slug,image_paths)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getAdminBookings(params: { status?: string; search?: string }) {
  let query = supabase
    .from('bookings')
    .select('*, profiles!customer_id(first_name,last_name,email), vehicles!vehicle_id(name,plate_number)')
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.search) query = query.or(`booking_number.ilike.%${params.search}%,profiles.first_name.ilike.%${params.search}%,profiles.last_name.ilike.%${params.search}%`)

  const { data } = await query
  return data || []
}

export async function getAdminDashboardData() {
  const [bRes, pRes, rbRes, vRes] = await Promise.all([
    supabase.from('bookings').select('id,status,total_amount,created_at', { count: 'exact' }),
    supabase.from('profiles').select('id,first_name,last_name,email,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('bookings').select('id,booking_number,vehicle_id,status,created_at,total_amount,customer_id,profiles!customer_id(first_name,last_name),vehicles!vehicle_id(name)').order('created_at', { ascending: false }).limit(3),
    supabase.from('vehicles').select('id,name,slug').eq('is_available', true),
  ])
  return { bRes, pRes, rbRes, vRes }
}

export async function cancelOwnBooking(id: string, reason: string) {
  const { error } = await supabase.rpc('cancel_own_booking', {
    target_booking_id: id,
    cancellation_type: 'customer_request',
    cancellation_reason: reason,
  })

  if (error) throw error
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const changes: Partial<Booking> & { updated_at?: string } = { status }

  if (status === 'canceled') changes.canceled_at = new Date().toISOString()
  if (status === 'completed') changes.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .update(changes)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Booking
}
