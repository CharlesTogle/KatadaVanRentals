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

export interface AdminBookingDetail {
  booking: Booking
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    mobile: string | null
    address?: string | null
    city?: string | null
    province?: string | null
    zip_code?: string | null
    country?: string | null
  } | null
  vehicle: { id: string; name: string; plate_number: string; image_paths: string[] } | null
  payments: Array<{ id: string; channel: string; status: string; amount: number; reference_number: string | null; receipt_path: string | null; paid_at: string | null; created_at: string }>
  documents: Array<{ id: string; document_type: string; status: string; file_path: string; original_filename: string | null; created_at: string }>
  status_events: Array<{ id: string; from_status: string | null; to_status: string; note: string | null; created_at: string }>
  extensions: Array<{ id: string; previous_end_at: string | null; new_end_at: string; extension_amount: number; reason: string | null; created_at: string }>
  invoice: { id: string; invoice_number: string; status: string; total_amount: number; file_path: string | null; issued_at: string } | null
}

export async function getAdminBookingByNumber(bookingNumber: string): Promise<AdminBookingDetail> {
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*, profiles!customer_id(id,first_name,last_name,email,mobile,address,city,province,zip_code,country), vehicles!vehicle_id(id,name,plate_number,image_paths)')
    .eq('booking_number', bookingNumber)
    .single()
  if (bErr) throw bErr

  const customer = booking.profiles && !Array.isArray(booking.profiles)
    ? booking.profiles as AdminBookingDetail['customer']
    : null
  const vehicle = booking.vehicles && !Array.isArray(booking.vehicles)
    ? booking.vehicles as AdminBookingDetail['vehicle']
    : null

  const [payRes, docRes, eventRes, extRes, invRes] = await Promise.all([
    supabase.from('payments').select('id,channel,status,amount,reference_number,receipt_path,paid_at,created_at').eq('booking_id', booking.id).order('created_at', { ascending: false }),
    supabase
      .from('booking_documents')
      .select('required, customer_documents!inner(id,document_type,status,file_path,original_filename,created_at)')
      .eq('booking_id', booking.id),
    supabase.from('booking_status_events').select('id,from_status,to_status,note,created_at').eq('booking_id', booking.id).order('created_at', { ascending: false }),
    supabase.from('booking_extensions').select('id,previous_end_at,new_end_at,extension_amount,reason,created_at').eq('booking_id', booking.id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id,invoice_number,status,total_amount,file_path,issued_at').eq('booking_id', booking.id).order('created_at', { ascending: false }).maybeSingle(),
  ])

  return {
    booking: booking as Booking,
    customer,
    vehicle,
    payments: payRes.data || [],
    documents: (docRes.data || []).map((d: Record<string, unknown>) => ({
      id: (d.customer_documents as Record<string, unknown>).id as string,
      document_type: (d.customer_documents as Record<string, unknown>).document_type as string,
      status: (d.customer_documents as Record<string, unknown>).status as string,
      file_path: (d.customer_documents as Record<string, unknown>).file_path as string,
      original_filename: (d.customer_documents as Record<string, unknown>).original_filename as string | null,
      created_at: (d.customer_documents as Record<string, unknown>).created_at as string,
    })),
    status_events: eventRes.data || [],
    extensions: extRes.data || [],
    invoice: invRes.data,
  }
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

export async function deleteBooking(id: string) {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export type AdminBookingActionType =
  | 'confirm'
  | 'reject'
  | 'request_documents'
  | 'adjust_price'
  | 'start_trip'
  | 'extend'
  | 'complete'
  | 'cancel'
  | 'delete'

export type AdminBookingActionInput =
  | { type: 'confirm'; bookingId: string; note?: string }
  | { type: 'reject'; bookingId: string; reason: string }
  | { type: 'request_documents'; bookingId: string; requestedDocuments: string }
  | { type: 'adjust_price'; bookingId: string; adjustedTotal: number; reason: string }
  | { type: 'start_trip'; bookingId: string; collectedAmount: number; paymentMethodId?: string; paymentChannel?: string; referenceNumber?: string; receiptPath?: string }
  | { type: 'extend'; bookingId: string; newEndAt: string; extensionAmount: number; reason?: string; collectNow?: boolean; paymentMethodId?: string; paymentChannel?: string; referenceNumber?: string; receiptPath?: string }
  | { type: 'complete'; bookingId: string; note?: string }
  | { type: 'cancel'; bookingId: string; cancellationType: string; reason: string }
  | { type: 'delete'; bookingId: string }

export async function runAdminBookingAction(input: AdminBookingActionInput): Promise<void> {
  const { type, bookingId, ...params } = input

  const rpcMap: Record<AdminBookingActionType, { fn: string; args: Record<string, unknown> }> = {
    confirm: { fn: 'admin_confirm_booking', args: { target_booking_id: bookingId, note: (params as { note?: string }).note ?? null } },
    reject: { fn: 'admin_reject_booking', args: { target_booking_id: bookingId, reason: (params as { reason: string }).reason } },
    request_documents: { fn: 'admin_request_booking_documents', args: { target_booking_id: bookingId, requested_documents: (params as { requestedDocuments: string }).requestedDocuments } },
    adjust_price: { fn: 'admin_adjust_booking_price', args: { target_booking_id: bookingId, adjusted_total: (params as { adjustedTotal: number }).adjustedTotal, reason: (params as { reason: string }).reason } },
    start_trip: {
      fn: 'admin_start_trip',
      args: {
        target_booking_id: bookingId,
        collected_amount: (params as { collectedAmount: number }).collectedAmount,
        payment_method_id: (params as { paymentMethodId?: string }).paymentMethodId ?? null,
        payment_channel: (params as { paymentChannel?: string }).paymentChannel ?? 'cash',
        reference_number: (params as { referenceNumber?: string }).referenceNumber ?? null,
        receipt_path: (params as { receiptPath?: string }).receiptPath ?? null,
      },
    },
    extend: {
      fn: 'admin_extend_booking',
      args: {
        target_booking_id: bookingId,
        new_end_at: (params as { newEndAt: string }).newEndAt,
        extension_amount: (params as { extensionAmount: number }).extensionAmount,
        reason: (params as { reason?: string }).reason ?? null,
        collect_now: (params as { collectNow?: boolean }).collectNow ?? false,
        payment_method_id: (params as { paymentMethodId?: string }).paymentMethodId ?? null,
        payment_channel: (params as { paymentChannel?: string }).paymentChannel ?? null,
        reference_number: (params as { referenceNumber?: string }).referenceNumber ?? null,
        receipt_path: (params as { receiptPath?: string }).receiptPath ?? null,
      },
    },
    complete: { fn: 'admin_complete_booking', args: { target_booking_id: bookingId, note: (params as { note?: string }).note ?? null } },
    cancel: { fn: 'admin_cancel_booking', args: { target_booking_id: bookingId, cancellation_type: (params as { cancellationType: string }).cancellationType, reason: (params as { reason: string }).reason } },
    delete: { fn: 'admin_delete_booking', args: { target_booking_id: bookingId } },
  }

  const rpc = rpcMap[type]
  const { error } = await supabase.rpc(rpc.fn, rpc.args)
  if (error) throw error
}
