import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types/booking'
import type { BookingStatus } from '@/types/booking'

export interface CustomerBookingDetail {
  booking: Booking
  vehicle: AdminBookingDetail['vehicle']
  payments: AdminBookingDetail['payments']
  status_events: AdminBookingDetail['status_events']
  cancellation: AdminBookingDetail['cancellation']
  extensions: AdminBookingDetail['extensions']
  invoice: AdminBookingDetail['invoice']
  requested_document_types: Array<{ id: string; label: string; upload: { id: string; file_path: string; original_filename: string | null; mime_type: string | null; size_bytes: number | null; status: string; created_at: string } | null }>
  feedback: { id: string; rating: number; feedback: string | null; created_at: string } | null
}

type BookingCancellation = {
  cancellation_type: string
  reason: string | null
  created_at: string
}

export async function getBookingById(id: string): Promise<CustomerBookingDetail> {
  await supabase.rpc('recalculate_booking_overdue_fee', { target_booking_id: id, as_of: new Date().toISOString() })
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, vehicles!vehicle_id(id,name,plate_number,image_paths)')
    .eq('id', id)
    .single()

  if (bookingError) throw bookingError

  const [paymentsRes, eventsRes, extensionsRes, invoiceRes, cancellationRes, typesRes, uploadsRes, feedbackRes] = await Promise.all([
    supabase.from('payments').select('id,channel,status,amount,reference_number,receipt_path,paid_at,created_at').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('booking_status_events').select('id,from_status,to_status,note,created_at').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('booking_extensions').select('id,previous_end_at,new_end_at,extension_amount,reason,payment_id,created_at').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id,invoice_number,status,total_amount,file_path,issued_at').eq('booking_id', id).order('created_at', { ascending: false }).maybeSingle(),
    supabase.from('booking_cancellations').select('cancellation_type,reason,created_at').eq('booking_id', id).order('created_at', { ascending: false }).maybeSingle(),
    supabase.from('booking_requested_document_types').select('id,label,created_at').eq('booking_id', id).order('created_at', { ascending: true }),
    supabase.from('booking_requested_documents').select('id,requested_type_id,file_path,original_filename,mime_type,size_bytes,status,created_at').eq('booking_id', id).order('created_at', { ascending: true }),
    supabase.from('booking_feedback').select('id,rating,feedback,created_at').eq('booking_id', id).maybeSingle(),
  ])

  const vehicle = booking.vehicles && !Array.isArray(booking.vehicles)
    ? booking.vehicles as AdminBookingDetail['vehicle']
    : null

  if (typesRes.error) throw typesRes.error
  if (uploadsRes.error) throw uploadsRes.error

  const uploadMap = new Map((uploadsRes.data || []).map((u) => [u.requested_type_id, u]))
  const requestedDocumentTypes = (typesRes.data || []).map((type) => ({
    id: type.id,
    label: type.label,
    upload: uploadMap.get(type.id)
      ? {
          id: uploadMap.get(type.id)!.id,
          file_path: uploadMap.get(type.id)!.file_path,
          original_filename: uploadMap.get(type.id)!.original_filename,
          mime_type: uploadMap.get(type.id)!.mime_type,
          size_bytes: uploadMap.get(type.id)!.size_bytes,
          status: uploadMap.get(type.id)!.status,
          created_at: uploadMap.get(type.id)!.created_at,
        }
      : null,
  }))

  return {
    booking: booking as Booking,
    vehicle,
    payments: paymentsRes.data || [],
    status_events: eventsRes.data || [],
    cancellation: cancellationRes.data,
    extensions: extensionsRes.data || [],
    invoice: invoiceRes.data,
    requested_document_types: requestedDocumentTypes as CustomerBookingDetail['requested_document_types'],
    feedback: feedbackRes.data,
  }
}

export async function getMyBookings(status?: string) {
  let query = supabase
    .from('bookings')
    .select('id, booking_number, vehicle_id, start_at, end_at, duration_days, distance_km, booking_mode, total_amount, paid_amount, remaining_amount, status, created_at, rental_model, flagged_for_manual_pricing, vehicles!vehicle_id(name,slug,image_paths)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export interface AdminBookingsPage {
  items: Record<string, unknown>[]
  total: number
}

export type AdminBookingSortField = 'created_at' | 'start_at' | 'end_at'
export type AdminBookingSortDirection = 'asc' | 'desc'

export async function getAdminBookings(params: {
  status?: string
  search?: string
  page: number
  pageSize: number
  sortField?: AdminBookingSortField
  sortDirection?: AdminBookingSortDirection
}): Promise<AdminBookingsPage> {
  const search = params.search?.trim().replace(/[%,()]/g, '')
  const offset = (Math.max(params.page, 1) - 1) * params.pageSize
  const sortField = params.sortField || 'created_at'
  const sortDirection = params.sortDirection || 'desc'

  let matchingIds: string[] | null = null

  if (search) {
    const [{ data: bookingNumberMatches, error: bookingSearchError }, { data: profileMatches, error: profileSearchError }] = await Promise.all([
      supabase.from('bookings').select('id').ilike('booking_number', `%${search}%`),
      supabase.from('profiles').select('id').or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`),
    ])

    if (bookingSearchError) throw bookingSearchError
    if (profileSearchError) throw profileSearchError

    const profileIds = (profileMatches || []).map((profile) => profile.id)
    const { data: profileBookingMatches, error: profileBookingSearchError } = profileIds.length
      ? await supabase.from('bookings').select('id').in('customer_id', profileIds)
      : { data: [], error: null }

    if (profileBookingSearchError) throw profileBookingSearchError

    matchingIds = [...new Set([
      ...(bookingNumberMatches || []).map((booking) => booking.id),
      ...(profileBookingMatches || []).map((booking) => booking.id),
    ])]

    if (!matchingIds.length) return { items: [], total: 0 }
  }

  let query = supabase
    .from('bookings')
    .select('*, profiles!customer_id(first_name,last_name,email), vehicles!vehicle_id(name,plate_number)', { count: 'exact' })
    .order(sortField, { ascending: sortDirection === 'asc' })
    .range(offset, offset + params.pageSize - 1)

  if (params.status) query = query.eq('status', params.status)
  if (matchingIds) query = query.in('id', matchingIds)

  const { data, count, error } = await query
  if (error) throw error

  return { items: (data || []) as Record<string, unknown>[], total: count || 0 }
}

export interface AdminFeedbackRow {
  id: string
  rating: number
  feedback: string | null
  display_on_homepage: boolean
  created_at: string
  booking_number: string | null
  customer_name: string
  customer_email: string
  profile_image_path: string | null
  vehicle_plate: string
}

export interface HomepageTestimonial {
  id: string
  rating: number
  feedback: string | null
  customer_name: string
  profile_image_path: string | null
}

export async function getAdminFeedback() {
  const { data, error } = await supabase
    .from('booking_feedback')
    .select('id,rating,feedback,display_on_homepage,created_at,bookings!booking_id(booking_number),profiles!customer_id(first_name,last_name,email,profile_image_path),vehicles!vehicle_id(plate_number)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((row: any) => {
    const booking = row.bookings && !Array.isArray(row.bookings) ? row.bookings : null
    const profile = row.profiles && !Array.isArray(row.profiles) ? row.profiles : null
    const vehicle = row.vehicles && !Array.isArray(row.vehicles) ? row.vehicles : null

    return {
      id: row.id,
      rating: row.rating,
      feedback: row.feedback,
      display_on_homepage: row.display_on_homepage,
      created_at: row.created_at,
      booking_number: booking?.booking_number || null,
      customer_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Unknown customer',
      customer_email: profile?.email || '—',
      profile_image_path: profile?.profile_image_path || null,
      vehicle_plate: vehicle?.plate_number || '—',
    }
  }) as AdminFeedbackRow[]
}

export async function setFeedbackHomepageVisibility(id: string, displayOnHomepage: boolean) {
  const { error } = await supabase
    .from('booking_feedback')
    .update({ display_on_homepage: displayOnHomepage })
    .eq('id', id)

  if (error) throw error
}

export async function getHomepageTestimonials(): Promise<HomepageTestimonial[]> {
  const { data, error } = await supabase.rpc('get_homepage_testimonials')

  if (error) throw error

  return (data || []).map((row: any) => ({
    id: row.id,
    rating: row.rating,
    feedback: row.feedback,
    customer_name: row.customer_name,
    profile_image_path: row.profile_image_path,
  }))
}

export async function getAdminDashboardData() {
  const [bRes, pRes, vRes] = await Promise.all([
    supabase.from('bookings').select('id,status,total_amount,created_at,vehicle_id,profiles!customer_id(first_name,last_name),vehicles!vehicle_id(name)', { count: 'exact' }),
    supabase.from('profiles').select('id,created_at'),
    supabase.from('vehicles').select('id,name,vehicle_type,is_available'),
  ])
  return { bRes, pRes, vRes }
}

export async function cancelOwnBooking(id: string, reason: string) {
  const { error } = await supabase.rpc('cancel_own_booking', {
    target_booking_id: id,
    cancellation_type: 'customer_request',
    cancellation_reason: reason,
  })

  if (error) throw error
}

export async function acceptOwnPriceAdjustment(id: string) {
  const { error } = await supabase.rpc('accept_own_price_adjustment', {
    target_booking_id: id,
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
  cancellation: BookingCancellation | null
  documents: Array<{ id: string; document_type: string; status: string; file_path: string; original_filename: string | null; mime_type: string | null; created_at: string }>
  requested_document_types: Array<{ id: string; label: string; upload: { id: string; file_path: string; original_filename: string | null; mime_type: string | null; size_bytes: number | null; status: string; created_at: string } | null }>
  status_events: Array<{ id: string; from_status: string | null; to_status: string; note: string | null; created_at: string }>
  extensions: Array<{ id: string; previous_end_at: string | null; new_end_at: string; extension_amount: number; reason: string | null; payment_id?: string | null; created_at: string }>
  invoice: { id: string; invoice_number: string; status: string; total_amount: number; file_path: string | null; issued_at: string } | null
}

export interface BookingInvoiceData {
  booking: Booking
  customer: {
    first_name: string | null
    last_name: string | null
    email: string | null
    mobile: string | null
    address: string | null
    city: string | null
    province: string | null
    zip_code: string | null
    country: string | null
  } | null
  vehicle: {
    name: string | null
    year: number | null
  } | null
  payments: Array<{
    id: string
    channel: string
    amount: number
    reference_number: string | null
    paid_at: string | null
    created_at: string
  }>
  business: {
    business_name: string
    support_email: string
    support_phone: string
    business_address: string
    city: string
    province: string
    vat_percent: number
  }
}

const DEFAULT_BUSINESS_SETTINGS = {
  business_name: 'Katada Transportation Services',
  support_email: 'tadsuu@gmail.com',
  support_phone: '+639064961248',
  business_address: '11th 12th St., Villamor',
  city: 'Pasay City',
  province: 'Metro Manila',
  vat_percent: 0,
}

export async function getBookingInvoiceData(id: string): Promise<BookingInvoiceData> {
  const [bookingRes, paymentsRes, settingsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, profiles!customer_id(first_name,last_name,email,mobile,address,city,province,zip_code,country), vehicles!vehicle_id(name,year)')
      .eq('id', id)
      .single(),
    supabase
      .from('payments')
      .select('id,channel,amount,reference_number,paid_at,created_at')
      .eq('booking_id', id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: true }),
    supabase
      .from('app_settings')
      .select('business_name,support_email,support_phone,business_address,city,province,tax_mode')
      .limit(1)
      .maybeSingle(),
  ])

  if (bookingRes.error) throw bookingRes.error
  if (paymentsRes.error) throw paymentsRes.error
  if (settingsRes.error) throw settingsRes.error

  const bookingRow = bookingRes.data as Booking & {
    profiles?: BookingInvoiceData['customer'] | BookingInvoiceData['customer'][] | null
    vehicles?: BookingInvoiceData['vehicle'] | BookingInvoiceData['vehicle'][] | null
  }

  const customer = bookingRow.profiles && !Array.isArray(bookingRow.profiles)
    ? bookingRow.profiles
    : null
  const vehicle = bookingRow.vehicles && !Array.isArray(bookingRow.vehicles)
    ? bookingRow.vehicles
    : null

  return {
    booking: bookingRow,
    customer,
    vehicle,
    payments: paymentsRes.data || [],
    business: {
      business_name: settingsRes.data?.business_name || DEFAULT_BUSINESS_SETTINGS.business_name,
      support_email: settingsRes.data?.support_email || DEFAULT_BUSINESS_SETTINGS.support_email,
      support_phone: settingsRes.data?.support_phone || DEFAULT_BUSINESS_SETTINGS.support_phone,
      business_address: settingsRes.data?.business_address || DEFAULT_BUSINESS_SETTINGS.business_address,
      city: settingsRes.data?.city || DEFAULT_BUSINESS_SETTINGS.city,
      province: settingsRes.data?.province || DEFAULT_BUSINESS_SETTINGS.province,
      vat_percent: settingsRes.data?.tax_mode === 'vat' ? 12 : settingsRes.data?.tax_mode === 'percentage_tax' ? 3 : DEFAULT_BUSINESS_SETTINGS.vat_percent,
    },
  }
}

export async function getAdminBookingByNumber(bookingNumber: string): Promise<AdminBookingDetail> {
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*, profiles!customer_id(id,first_name,last_name,email,mobile,address,city,province,zip_code,country), vehicles!vehicle_id(id,name,plate_number,image_paths)')
    .eq('booking_number', bookingNumber)
    .single()
  if (bErr) throw bErr

  const { data: refreshedBooking } = await supabase.rpc('recalculate_booking_overdue_fee', { target_booking_id: booking.id, as_of: new Date().toISOString() })
  const currentBooking = refreshedBooking ? { ...booking, ...refreshedBooking } : booking

  const customer = currentBooking.profiles && !Array.isArray(currentBooking.profiles)
    ? currentBooking.profiles as AdminBookingDetail['customer']
    : null
  const vehicle = currentBooking.vehicles && !Array.isArray(currentBooking.vehicles)
    ? currentBooking.vehicles as AdminBookingDetail['vehicle']
    : null

  const [payRes, docRes, eventRes, extRes, invRes, cancellationRes, typesRes, uploadsRes] = await Promise.all([
    supabase.from('payments').select('id,channel,status,amount,reference_number,receipt_path,paid_at,created_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: false }),
    currentBooking.customer_id
      ? supabase.from('customer_documents').select('id,document_type,status,file_path,original_filename,mime_type,created_at').eq('customer_id', currentBooking.customer_id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('booking_status_events').select('id,from_status,to_status,note,created_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: false }),
    supabase.from('booking_extensions').select('id,previous_end_at,new_end_at,extension_amount,reason,payment_id,created_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id,invoice_number,status,total_amount,file_path,issued_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: false }).maybeSingle(),
    supabase.from('booking_cancellations').select('cancellation_type,reason,created_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: false }).maybeSingle(),
    supabase.from('booking_requested_document_types').select('id,label,created_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: true }),
    supabase.from('booking_requested_documents').select('id,requested_type_id,file_path,original_filename,mime_type,size_bytes,status,created_at').eq('booking_id', currentBooking.id).order('created_at', { ascending: true }),
  ])

  if (typesRes.error) throw typesRes.error
  if (uploadsRes.error) throw uploadsRes.error

  const uploadMap = new Map((uploadsRes.data || []).map((u) => [u.requested_type_id, u]))
  const requestedDocumentTypes = (typesRes.data || []).map((type) => ({
    id: type.id,
    label: type.label,
    upload: uploadMap.get(type.id)
      ? {
          id: uploadMap.get(type.id)!.id,
          file_path: uploadMap.get(type.id)!.file_path,
          original_filename: uploadMap.get(type.id)!.original_filename,
          mime_type: uploadMap.get(type.id)!.mime_type,
          size_bytes: uploadMap.get(type.id)!.size_bytes,
          status: uploadMap.get(type.id)!.status,
          created_at: uploadMap.get(type.id)!.created_at,
        }
      : null,
  }))

  return {
    booking: currentBooking as Booking,
    customer,
    vehicle,
    payments: payRes.data || [],
    cancellation: cancellationRes.data,
    documents: (docRes.data || []) as AdminBookingDetail['documents'],
    requested_document_types: requestedDocumentTypes as AdminBookingDetail['requested_document_types'],
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
  | 'set_price_for_manual'
  | 'start_trip'
  | 'extend'
  | 'complete'
  | 'make_payment'
  | 'cancel'
  | 'delete'

export type AdminBookingActionInput =
  | { type: 'confirm'; bookingId: string; note?: string }
  | { type: 'reject'; bookingId: string; reason: string }
  | { type: 'request_documents'; bookingId: string; requestedDocumentLabels: string[] }
  | { type: 'adjust_price'; bookingId: string; adjustedTotal: number; reason: string }
  | { type: 'start_trip'; bookingId: string; collectedAmount: number; paymentMethodId?: string; paymentChannel?: string; referenceNumber?: string; receiptPath?: string }
  | { type: 'extend'; bookingId: string; newEndAt: string; extensionAmount: number; reason?: string; collectNow?: boolean; paymentMethodId?: string; paymentChannel?: string; referenceNumber?: string; receiptPath?: string }
  | { type: 'complete'; bookingId: string; collectedAmount?: number; paymentMethodId?: string; paymentChannel?: string; referenceNumber?: string; receiptPath?: string; actualTollAmount?: number; actualFuelAmount?: number; note?: string }
  | { type: 'make_payment'; bookingId: string; collectedAmount: number; paymentMethodId?: string; paymentChannel?: string; referenceNumber?: string; receiptPath?: string; idempotencyKey?: string }
  | { type: 'cancel'; bookingId: string; cancellationType: string; reason: string }
  | { type: 'delete'; bookingId: string }
  | { type: 'set_price_for_manual'; bookingId: string; adjustedTotal: number; reason: string }

export interface SubmittedPaymentRow {
  id: string
  booking_id: string
  channel: string
  status: string
  amount: number
  reference_number: string | null
  verified_at: string | null
  paid_at: string | null
  created_at: string
  booking_number: string
  customer_id: string | null
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
  vehicle_id: string
  vehicle_name: string
  vehicle_plate: string | null
  payment_method_provider: string | null
}

export async function getSubmittedPayments(from?: string, to?: string): Promise<SubmittedPaymentRow[]> {
  const { data, error } = await supabase.rpc('get_revenue_report', {
    from_date: from || null,
    to_date: to || null,
  })

  if (error) throw error

  return ((data || []) as any[]).map((row: any) => ({
    id: row.id,
    booking_id: row.booking_id,
    channel: row.channel,
    status: row.status,
    amount: row.amount,
    reference_number: row.reference_number,
    verified_at: row.verified_at,
    paid_at: row.paid_at,
    created_at: row.created_at,
    booking_number: row.booking_number,
    customer_id: row.customer_id,
    customer_first_name: row.customer_first_name,
    customer_last_name: row.customer_last_name,
    customer_email: row.customer_email,
    vehicle_id: row.vehicle_id,
    vehicle_name: row.vehicle_name,
    vehicle_plate: row.vehicle_plate,
    payment_method_provider: row.payment_method_provider,
  }))
}

export async function runAdminBookingAction(input: AdminBookingActionInput): Promise<void> {
  const { type, bookingId, ...params } = input

  if (type === 'complete') {
    const { error: overdueError } = await supabase.rpc('recalculate_booking_overdue_fee', {
      target_booking_id: bookingId,
      as_of: new Date().toISOString(),
    })
    if (overdueError) throw overdueError
  }

  const rpcMap: Record<AdminBookingActionType, { fn: string; args: Record<string, unknown> }> = {
    confirm: { fn: 'admin_confirm_booking', args: { target_booking_id: bookingId, note: (params as { note?: string }).note ?? null } },
    reject: { fn: 'admin_reject_booking', args: { target_booking_id: bookingId, reason: (params as { reason: string }).reason } },
    request_documents: { fn: 'admin_request_booking_documents', args: { target_booking_id: bookingId, requested_document_labels: (params as { requestedDocumentLabels: string[] }).requestedDocumentLabels } },
    adjust_price: { fn: 'admin_adjust_booking_price', args: { target_booking_id: bookingId, adjusted_total: (params as { adjustedTotal: number }).adjustedTotal, reason: (params as { reason: string }).reason } },
    set_price_for_manual: { fn: 'admin_set_manual_price', args: { target_booking_id: bookingId, price: (params as { adjustedTotal: number }).adjustedTotal, reason: (params as { reason: string }).reason } },
    start_trip: {
      fn: 'admin_start_trip',
      args: {
        target_booking_id: bookingId,
        collected_amount: (params as { collectedAmount: number }).collectedAmount,
        payment_method_id: (params as { paymentMethodId?: string }).paymentMethodId ?? null,
        payment_channel: (params as { paymentChannel?: string }).paymentChannel ?? 'cash',
        p_reference_number: (params as { referenceNumber?: string }).referenceNumber ?? null,
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
    complete: {
      fn: 'admin_complete_booking',
      args: {
        target_booking_id: bookingId,
        collected_amount: (params as { collectedAmount?: number }).collectedAmount ?? 0,
        payment_method_id: (params as { paymentMethodId?: string }).paymentMethodId ?? null,
        payment_channel: (params as { paymentChannel?: string }).paymentChannel ?? 'cash',
        reference_number: (params as { referenceNumber?: string }).referenceNumber ?? null,
        receipt_path: (params as { receiptPath?: string }).receiptPath ?? null,
        actual_toll_amount: (params as { actualTollAmount?: number }).actualTollAmount ?? null,
        actual_fuel_amount: (params as { actualFuelAmount?: number }).actualFuelAmount ?? null,
        note: (params as { note?: string }).note ?? null,
      },
    },
    make_payment: {
      fn: 'admin_record_completed_booking_payment',
      args: {
        target_booking_id: bookingId,
        collected_amount: (params as { collectedAmount: number }).collectedAmount,
        payment_method_id: (params as { paymentMethodId?: string }).paymentMethodId ?? null,
        payment_channel: (params as { paymentChannel?: string }).paymentChannel ?? 'cash',
         p_reference_number: (params as { referenceNumber?: string }).referenceNumber ?? null,
        receipt_path: (params as { receiptPath?: string }).receiptPath ?? null,
        p_idempotency_key: (params as { idempotencyKey?: string }).idempotencyKey ?? null,
      },
    },
    cancel: { fn: 'admin_cancel_booking', args: { target_booking_id: bookingId, cancellation_type: (params as { cancellationType: string }).cancellationType, reason: (params as { reason: string }).reason } },
    delete: { fn: 'admin_delete_booking', args: { target_booking_id: bookingId } },
  }

  const rpc = rpcMap[type]
  const { error } = await supabase.rpc(rpc.fn, rpc.args)
  if (error) throw error
}
