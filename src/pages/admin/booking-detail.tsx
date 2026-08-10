import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAdminBooking, useAdminBookingAction } from '@/hooks/use-bookings'
import { useFileViewer } from '@/hooks/use-file-viewer'
import { getCustomerDocumentSignedUrl } from '@/services/document-service'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { useAppSettings } from '@/hooks/use-app-settings'
import { canDownloadInvoice, formatBookingStatus, formatCancellationType, getAdminBookingDetailActions, getBookingCadenceLabel, getBookingCadenceValue, type AdminAction, type AdminActionType } from '@/lib/booking-utils'
import { STATUS_COLORS } from '@/config/constants'
import { getBookingAdjustmentSummary } from '@/lib/booking-adjustment'
import { getBookingExpiryDeadline, getBookingExpiryMessage } from '@/lib/booking-expiry'
import { getDisplayBookingNote } from '@/lib/booking-notes'
import { cn } from '@/lib/utils'
import { showError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { downloadBookingInvoicePdf } from '@/lib/invoice-pdf'
import { supabase } from '@/lib/supabase'
import { UPLOAD_POLICIES } from '@/config/constants'
import { removeUploadedFileWithQueue, uploadFile } from '@/services/upload-service'
import { logError } from '@/lib/logger'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Dialog } from '@/components/ui/dialog'
import { ImageViewer } from '@/components/ui/image-viewer'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Mail,
  MapPin,
  Phone,
  Receipt,
  User,
} from 'lucide-react'

const TIMELINE_STATUSES = ['for_review', 'awaiting_documents', 'confirmed', 'on_trip', 'completed']
const PAYMENT_RECEIPT_BUCKET = 'payment-receipts'
const MAX_BOOKING_ADJUSTMENT = 99999.99

function getPaymentReceiptPathCandidates(filePath: string) {
  const trimmedPath = filePath.replace(/^\/+/, '')
  const strippedBucketPath = trimmedPath.replace(new RegExp(`^${PAYMENT_RECEIPT_BUCKET}/`), '')

  return [...new Set([
    strippedBucketPath,
    trimmedPath,
    `${PAYMENT_RECEIPT_BUCKET}/${strippedBucketPath}`,
  ].filter(Boolean))]
}

export default function BookingDetail() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useAdminBooking(bookingNumber)
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: appSettings } = useAppSettings()
  const bookingAction = useAdminBookingAction()
  const { viewing, openingId, openFile, closeViewer } = useFileViewer((viewError) => {
    toast.error(showError(viewError))
  })
  const [activeModal, setActiveModal] = useState<AdminActionType | null>(null)
  const [modalError, setModalError] = useState('')
  const [modalForm, setModalForm] = useState({
    reason: '',
    amount: '',
    actualTollAmount: '',
    actualFuelAmount: '',
    adjustmentType: 'increase' as 'increase' | 'decrease',
    newDate: '',
    paymentMethodId: '',
    paymentChannel: 'cash',
    referenceNumber: '',
    collectNow: true,
    receiptFile: null as File | null,
  })
  const bookingStatus = data?.booking.status
  const defaultPaymentMethodId = paymentMethods[0]?.id || ''
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)
  const timelineIdx = useMemo(() => bookingStatus ? TIMELINE_STATUSES.indexOf(bookingStatus) : -1, [bookingStatus])

  useEffect(() => {
    if (activeModal) return

    setModalForm({
      reason: '',
      amount: '',
      actualTollAmount: '',
      actualFuelAmount: '',
      adjustmentType: 'increase',
      newDate: '',
      paymentMethodId: defaultPaymentMethodId,
      paymentChannel: 'cash',
      referenceNumber: '',
      collectNow: true,
      receiptFile: null,
    })
  }, [activeModal, defaultPaymentMethodId])

  useEffect(() => {
    setModalError('')
  }, [activeModal])

  useEffect(() => {
    if (!defaultPaymentMethodId) return

    setModalForm((current) => current.paymentMethodId ? current : { ...current, paymentMethodId: defaultPaymentMethodId })
  }, [defaultPaymentMethodId])

  if (isLoading) {
    return (
      <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
          <div className="h-32 rounded-xl bg-[#071f52]/6 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
            <div className="h-48 rounded-xl bg-[#071f52]/6 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Link to="/admin/bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#071f52]/60 hover:text-[#071f52] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-12 text-center">
          <p className="text-sm font-bold text-[#071f52]/48">Booking not found.</p>
        </div>
      </div>
    )
  }

  const { booking, customer, vehicle, payments, cancellation, documents, requested_document_types, status_events, extensions, invoice } = data
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email || 'Customer'
    : booking.guest_name || booking.guest_email || 'Guest customer'
  const customerAddress = customer && 'address' in customer
    ? formatAddress([
        customer.address as string | null | undefined,
        customer.city as string | null | undefined,
        customer.province as string | null | undefined,
        customer.zip_code as string | null | undefined,
        customer.country as string | null | undefined,
      ])
    : ''
  const customerNote = getDisplayBookingNote(booking.notes)
  const rejectionReason = booking.status === 'rejected'
    ? status_events.find((e) => e.to_status === 'rejected' && e.note)?.note || null
    : null
  const cancellationReason = booking.status === 'canceled'
    ? cancellation?.reason ? `Type: ${cancellation.cancellation_type}. Reason: ${cancellation.reason}` : null
    : null
  const statusTone = getStatusTone(booking.status)
  const statusMessage = getStatusMessage(booking.status, rejectionReason, cancellationReason)
  const expiryMessage = getBookingExpiryMessage(
    booking.status,
    getBookingExpiryDeadline(booking.start_at, appSettings?.booking_expiry_hours ?? 2),
  )
  const tripReconciliationAmount = Number(booking.actual_toll_amount || 0) + Number(booking.actual_fuel_amount || 0)
  const balanceSummary = getBookingAdjustmentSummary(booking, status_events, extensions)
  const displayedTotal = Number(booking.total_amount || 0)
  const depositAmount = Number(booking.deposit_amount || 0)
  const paymentMadeAmount = payments
    .filter((payment) => payment.status === 'submitted')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const displayedRemainingBalance = Number(booking.remaining_amount || 0)
  const isRefundableBooking = cancellation?.refund_status === 'pending_refund' || cancellation?.refund_status === 'refund_processed'
  const requiresTripReconciliation = booking.rental_model === 'all_in' && booking.status === 'on_trip'
  const actualTollAmount = Number(modalForm.actualTollAmount || 0)
  const actualFuelAmount = Number(modalForm.actualFuelAmount || 0)
  const actions: AdminAction[] = !bookingStatus
    ? []
    : bookingStatus !== 'completed' || displayedRemainingBalance <= 0
      ? getAdminBookingDetailActions(bookingStatus, booking.flagged_for_manual_pricing, cancellation?.refund_status)
      : [{ type: 'make_payment', label: 'Make a Payment', variant: 'primary' }, ...getAdminBookingDetailActions(bookingStatus, false, cancellation?.refund_status)]
  const primaryActions = actions.filter((action) => action.variant !== 'danger')
  const destructiveActions = actions.filter((action) => action.variant === 'danger')
  const minimumExtensionDateTime = getMinimumExtensionDateTime(booking.end_at)
  const isExtensionDateValid = !minimumExtensionDateTime || modalForm.newDate > minimumExtensionDateTime
  const bookingSummary = [vehicle?.name || 'Vehicle pending', customerName, formatDateRange(booking.start_at, booking.end_at)]
    .filter(Boolean)
    .join('  ·  ')

  const runAction = async (
    input: Parameters<typeof bookingAction.mutateAsync>[0],
    successMessage: string,
    onSuccess?: () => void,
    receiptPath?: string,
  ) => {
    try {
      await bookingAction.mutateAsync(input)
      setActiveModal(null)
      toast.success(successMessage)
      onSuccess?.()
    } catch (actionError) {
      if (receiptPath) await removeUploadedFileWithQueue(PAYMENT_RECEIPT_BUCKET, receiptPath).catch((cleanupError) => {
        logError('admin-booking', 'Failed to remove payment receipt after booking failure', cleanupError)
      })
      const message = showError(actionError as Error)
      setModalError(message)
      toast.error(message)
    }
  }

  const handleDownloadInvoice = async () => {
    setIsDownloadingInvoice(true)

    try {
      await downloadBookingInvoicePdf(booking.id)
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setIsDownloadingInvoice(false)
    }
  }

  const handleConfirmBooking = () => runAction({ type: 'confirm', bookingId: booking.id }, 'Booking confirmed.')
  const handleRejectBooking = () => runAction({ type: 'reject', bookingId: booking.id, reason: modalForm.reason.trim() }, 'Booking rejected.')
  const adjustmentAmount = Number(modalForm.amount || 0)
  const signedAdjustmentAmount = modalForm.adjustmentType === 'decrease' ? -adjustmentAmount : adjustmentAmount
  const adjustedTotal = displayedTotal + signedAdjustmentAmount

  const handleAdjustBooking = () => runAction({ type: 'adjust_price', bookingId: booking.id, adjustedTotal, reason: modalForm.reason.trim() }, 'Booking price updated.')
  const handleSetManualPrice = () => runAction(
    { type: 'set_price_for_manual', bookingId: booking.id, adjustedTotal: Number(modalForm.amount || 0), reason: modalForm.reason.trim() || 'Manual pricing set' },
    'Price set. Booking moved to pending price approval.',
  )
  const handleRequestDocuments = (labels: string[]) => runAction({ type: 'request_documents', bookingId: booking.id, requestedDocumentLabels: labels }, 'Document request sent.')
  const handleCompleteBooking = async () => {
    let receiptPath: string | undefined
    try {
      receiptPath = await uploadReceipt(modalForm.receiptFile)
    } catch (error) {
      toast.error(showError(error as Error))
      return
    }

    return runAction({
      type: 'complete',
      bookingId: booking.id,
      collectedAmount: Number(modalForm.amount || 0),
      paymentMethodId: modalForm.paymentMethodId || undefined,
      paymentChannel: modalForm.paymentChannel,
      referenceNumber: modalForm.referenceNumber.trim() || undefined,
      receiptPath,
      actualTollAmount: requiresTripReconciliation ? actualTollAmount : undefined,
      actualFuelAmount: requiresTripReconciliation ? actualFuelAmount : undefined,
    }, 'Booking marked as returned.', undefined, receiptPath)
  }

  const handleMakePayment = async () => {
    let receiptPath: string | undefined
    try {
      receiptPath = await uploadReceipt(modalForm.receiptFile)
    } catch (error) {
      toast.error(showError(error as Error))
      return
    }

    return runAction({
      type: 'make_payment',
      bookingId: booking.id,
      collectedAmount: Number(modalForm.amount),
      paymentMethodId: modalForm.paymentMethodId || undefined,
      paymentChannel: modalForm.paymentChannel,
      referenceNumber: modalForm.referenceNumber.trim() || undefined,
      receiptPath,
      idempotencyKey: crypto.randomUUID(),
    }, 'Payment recorded.', undefined, receiptPath)
  }
  const handleProcessRefund = async () => {
    let receiptPath: string | undefined
    try {
      receiptPath = await uploadReceipt(modalForm.receiptFile)
    } catch (error) {
      toast.error(showError(error as Error))
      return
    }

    return runAction({
      type: 'process_refund',
      bookingId: booking.id,
      amount: depositAmount,
      receiptPath,
    }, 'Refund processed.', undefined, receiptPath)
  }
  const handleDeleteBooking = () => runAction({ type: 'delete', bookingId: booking.id }, 'Booking deleted.', () => navigate('/admin/bookings'))

  const getPaymentReceiptSignedUrl = async (path: string) => {
    for (const candidate of getPaymentReceiptPathCandidates(path)) {
      const { data, error } = await supabase.storage.from(PAYMENT_RECEIPT_BUCKET).createSignedUrl(candidate, 3600)
      if (!error && data?.signedUrl) {
        return data.signedUrl
      }
    }

    throw new Error('Unable to create signed URL for receipt.')
  }

  const handleViewReceipt = async (paymentId: string, path: string) => {
    await openFile({
      id: paymentId,
      path,
      alt: 'Payment receipt',
      resolveUrl: getPaymentReceiptSignedUrl,
    })
  }

  const handleViewRefundProof = async (proofId: string, path: string) => {
    await openFile({
      id: proofId,
      path,
      alt: 'Refund proof',
      resolveUrl: getPaymentReceiptSignedUrl,
    })
  }

  const handleViewDocument = async (doc: { id: string; file_path: string; document_type?: string; mime_type?: string | null }) => {
    await openFile({
      id: doc.id,
      path: doc.file_path,
      alt: doc.document_type ? toLabel(doc.document_type) : 'Requested Document',
      resolveUrl: getCustomerDocumentSignedUrl,
      isPdf: doc.mime_type === 'application/pdf',
    })
  }

  const uploadReceipt = async (file: File | null) => {
    if (!file) return undefined

    const ext = file.name.split('.').pop()
    const path = `${booking.id}/${Date.now()}.${ext}`
    await uploadFile({ bucket: PAYMENT_RECEIPT_BUCKET, file, path, policy: UPLOAD_POLICIES.paymentReceipts })

    return path
  }

  const handleStartTrip = async () => {
    let receiptPath: string | undefined
    try {
      receiptPath = await uploadReceipt(modalForm.receiptFile)
    } catch (error) {
      toast.error(showError(error as Error))
      return
    }

    return runAction({
      type: 'start_trip',
      bookingId: booking.id,
      collectedAmount: Number(modalForm.amount),
      paymentMethodId: modalForm.paymentMethodId || undefined,
      paymentChannel: modalForm.paymentChannel,
      referenceNumber: modalForm.referenceNumber.trim() || undefined,
      receiptPath,
    }, 'Trip started.', undefined, receiptPath)
  }

  const handleExtendBooking = async () => {
    if (!isExtensionDateValid) {
      toast.error(`New return date must be after ${booking.end_at ? formatDateTime(booking.end_at) : 'the current return date'}`)
      return
    }

    let receiptPath: string | undefined
    if (modalForm.collectNow) {
      try {
        receiptPath = await uploadReceipt(modalForm.receiptFile)
      } catch (error) {
        toast.error(showError(error as Error))
        return
      }
    }

    return runAction({
      type: 'extend',
      bookingId: booking.id,
      newEndAt: modalForm.newDate,
      extensionAmount: Number(modalForm.amount),
      reason: modalForm.reason.trim() || undefined,
      collectNow: modalForm.collectNow,
      paymentMethodId: modalForm.collectNow ? modalForm.paymentMethodId || undefined : undefined,
      paymentChannel: modalForm.collectNow ? modalForm.paymentChannel : undefined,
      referenceNumber: modalForm.collectNow ? modalForm.referenceNumber.trim() || undefined : undefined,
      receiptPath,
    }, 'Booking extended.', undefined, receiptPath)
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4f7fb] py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[1440px]">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#071f52]/42">
          <Link to="/admin" className="transition-colors hover:text-[#071f52]">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/admin/bookings" className="transition-colors hover:text-[#071f52]">Bookings</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-bold text-[#071f52]">{booking.booking_number}</span>
        </nav>

        <Link to="/admin/bookings" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#071f52]/60 transition-colors hover:text-[#071f52]">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>

        <section className="rounded-[30px] border border-[#071f52]/8 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(7,31,82,0.08)] sm:px-7 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.65rem] font-black tracking-[-0.04em] text-[#3c42f6] sm:text-[1.9rem]">{booking.booking_number}</h1>
                <span className={cn('rounded-full px-4 py-1.5 text-xs font-bold', STATUS_COLORS[booking.status])}>
                  {formatBookingStatus(booking.status)}
                </span>
              </div>

              <p className="mt-3 max-w-[900px] text-sm font-medium leading-7 text-[#071f52]/64 sm:text-[1rem]">
                {bookingSummary}
                <span className="ml-2 inline-block font-black text-[#071f52] tabular-nums">{formatCurrency(displayedTotal)}</span>
              </p>
            </div>

            <div className="w-full sm:w-auto sm:min-w-[220px] text-left sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#071f52]/34">Created</p>
              <p className="mt-1 text-sm font-semibold text-[#071f52]/58">{formatDateTime(booking.created_at)}</p>
            </div>
          </div>

          <div className="mt-7 border-t border-[#071f52]/8 pt-8">
            <div className="relative">
              <div className="absolute left-5 right-5 top-4 hidden h-px bg-[#071f52]/10 sm:block" />
              <ol className="grid gap-3 sm:grid-cols-5 sm:gap-3">
                {TIMELINE_STATUSES.map((status, index) => {
                  const reached = timelineIdx >= index
                  const current = booking.status === status

                  return (
                    <li key={status} className="relative flex items-center gap-3 sm:flex-col sm:items-center sm:text-center">
                      <div className={cn(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                        current && 'border-[#4f46e5]/20 bg-[#4f46e5]/10 shadow-[0_0_0_7px_rgba(79,70,229,0.08)]',
                        !current && reached && 'border-[#071f52]/12 bg-[#071f52]',
                        !current && !reached && 'border-[#071f52]/10 bg-[#e9edf5]',
                      )}>
                        {current ? <div className="h-3 w-3 rounded-full bg-[#4f46e5]" /> : <Circle className={cn('h-3.5 w-3.5', reached ? 'fill-white text-white' : 'fill-[#cfd6e2] text-[#cfd6e2]')} />}
                      </div>

                      <div>
                        <p className={cn('text-[11px] font-bold', current ? 'text-[#4f46e5]' : reached ? 'text-[#071f52]' : 'text-[#071f52]/38')}>
                          {formatBookingStatus(status)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Booking Details</h2>
              </div>

              <div className="px-6 py-6">
                <div className={cn('mb-6 rounded-2xl border px-4 py-4', statusTone.wrapper)}>
                  <div className="flex items-start gap-3">
                    {booking.status !== 'rejected' && booking.status !== 'canceled' ? (
                      <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', statusTone.icon)} />
                    ) : null}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#071f52]/46">{statusMessage.title}</p>
                      <p className={cn('mt-1 text-sm font-medium leading-6', statusTone.text)}>{statusMessage.body}</p>
                      {expiryMessage ? <p className="mt-2 text-sm font-semibold leading-6 text-[#6f5a32]">{expiryMessage}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                  <Spec label="Vehicle" value={vehicle?.name || '—'} />
                  <Spec label="Service" value={booking.rental_model === 'self_drive' ? 'Self Drive' : 'With Driver'} />
                  <Spec label="Rental Model" value={toLabel(booking.rental_model)} />
                  {booking.rental_model !== 'self_drive' ? (
                    <Spec label="Booking Mode" value={formatBookingMode(booking.booking_mode)} />
                  ) : null}
                  <Spec label={getBookingCadenceLabel(booking)} value={getBookingCadenceValue(booking)} />
                  <Spec label="Start Date" value={formatDateTime(booking.start_at)} />
                  <Spec label="End Date" value={booking.end_at ? formatDateTime(booking.end_at) : '—'} />
                  <Spec label="Pickup Location" value={booking.pickup_location || '—'} />
                  <Spec label="Dropoff Location" value={booking.dropoff_location || '—'} />
                  <Spec label="Destination" value={booking.destination || booking.dropoff_location || '—'} />
                  <Spec label="Purpose of Travel" value={booking.purpose_of_travel || 'Not specified'} />
                </div>

                {booking.self_drive_address ? (
                  <div className="mt-6 rounded-2xl bg-[#f7f9fc] px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#071f52]/42">Self-Drive Address</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#071f52]/70">
                      {Object.values(booking.self_drive_address).filter(Boolean).join(', ')}
                    </p>
                  </div>
                ) : null}

                {customerNote ? (
                  <div className="mt-6 rounded-2xl bg-[#f7f9fc] px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#071f52]/42">Customer Note</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#071f52]/70">{customerNote}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Price Breakdown</h2>
              </div>

              <div className="px-6 py-6">
                {booking.flagged_for_manual_pricing ? (
                  <div className="rounded-[22px] border border-[#f59e0b]/10 bg-[#f59e0b]/4 px-5 py-5 text-center">
                    <p className="text-sm font-bold text-[#92400e]">Manual Pricing — TBD</p>
                    <p className="mt-1 text-xs font-medium text-[#92400e]/80">This booking is outside the service area. An admin must price it manually.</p>
                  </div>
                ) : (
                <>
                <div className="space-y-3">
                  {booking.price_line_items?.map((item, index) => (
                    <div key={index} className="flex items-start justify-between gap-2 border-b border-[#071f52]/6 pb-3 text-sm last:border-0 last:pb-0">
                      <span className="text-[#071f52]/64 min-w-0">{item.label}{item.detail ? ` (${item.detail})` : ''}</span>
                      <span className="font-bold text-[#071f52] tabular-nums shrink-0">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 rounded-[22px] bg-[#f7f9fc] px-5 py-5">
                  <SummaryRow label="Total" value={formatCurrency(displayedTotal)} strong valueClassName="text-[#4f46e5]" />
                  {booking.rental_model === 'all_in' && booking.status !== 'completed' && booking.in_service_area !== false ? <SummaryRow label="Fuel Estimate" value={formatCurrency(Number(booking.fuel_estimate_amount || 0))} note="estimate only - settled after trip" /> : null}
                  {booking.rental_model === 'all_in' && booking.status !== 'completed' && booking.in_service_area !== false ? <SummaryRow label="Toll Estimate" value={formatCurrency(Number(booking.toll_estimate_amount || 0))} note="estimate only - settled after trip" /> : null}
                  {Math.abs(balanceSummary?.adjustmentAmount || 0) > 0.009 ? <SummaryRow label="Price Adjustment" value={`${balanceSummary?.isIncrease ? '+' : '-'}${formatCurrency(Math.abs(balanceSummary?.adjustmentAmount || 0))}`} valueClassName={balanceSummary?.isIncrease ? 'text-[#f97316]' : 'text-[#16a34a]'} /> : null}
                  {balanceSummary && balanceSummary.extensionAmount > 0 ? <SummaryRow label={getExtensionChargeLabel(balanceSummary.extensionDays)} value={`+${formatCurrency(balanceSummary.extensionAmount)}`} valueClassName="text-[#f97316]" /> : null}
                  {booking.status === 'completed' && booking.rental_model === 'all_in' ? <SummaryRow label="Trip Reconciliation" value={`${tripReconciliationAmount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(tripReconciliationAmount))}`} valueClassName={tripReconciliationAmount >= 0 ? 'text-[#f97316]' : 'text-[#16a34a]'} note={`Toll ${formatCurrency(Number(booking.actual_toll_amount || 0))} · Gas ${formatCurrency(Number(booking.actual_fuel_amount || 0))}`} /> : null}
                   {depositAmount > 0 && <SummaryRow label="Security Deposit" value={`-${formatCurrency(depositAmount)}`} valueClassName="text-[#16a34a]" note={isRefundableBooking ? undefined : 'non-refundable'} />}
                  {paymentMadeAmount > 0 ? <SummaryRow label="Payment Made" value={`-${formatCurrency(paymentMadeAmount)}`} valueClassName="text-[#16a34a]" /> : null}
                  <SummaryRow label="Remaining Balance" value={formatCurrency(displayedRemainingBalance)} strong valueClassName="text-[#f97316]" />
                </div>
                </>
                )}
              </div>
            </section>

            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Payments</h2>
              </div>

              <div className="px-6 py-6">
                {payments.length ? (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex flex-col justify-between gap-4 rounded-[22px] border border-[#071f52]/8 bg-[#fbfcfe] px-4 py-4 sm:flex-row sm:items-start">
                        <div className="flex gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f46e5]">
                            <Receipt className="h-5 w-5" />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-black text-[#1f2a44] tabular-nums">{formatCurrency(payment.amount)}</p>
                              <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-bold text-[#4f46e5]">
                                {payment.status}
                              </span>
                            </div>

                             {payment.status !== 'refunded' ? (
                               <p className="mt-1 text-sm font-medium text-[#071f52]/62">
                                 via {toLabel(payment.channel)}{payment.channel !== 'ewallet' && payment.reference_number ? ` · ${payment.reference_number}` : ''}
                               </p>
                             ) : null}
                            <p className="mt-1 text-xs font-medium text-[#071f52]/40">{formatDateTime(payment.paid_at || payment.created_at)}</p>

                            {payment.receipt_path ? (
                              <a href="#" onClick={(e) => { e.preventDefault(); handleViewReceipt(payment.id, payment.receipt_path!) }} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4]">
                                <FileText className="h-4 w-4" /> {openingId === payment.id ? 'Opening...' : 'View receipt'}
                              </a>
                            ) : null}
                            {payment.status === 'refunded' && cancellation?.refund_receipt_path ? (
                              <a href="#" onClick={(e) => { e.preventDefault(); handleViewRefundProof(cancellation.id, cancellation.refund_receipt_path!) }} className="mt-3 ml-3 inline-flex items-center gap-1 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4]">
                                <FileText className="h-4 w-4" /> {openingId === cancellation.id ? 'Opening...' : 'View proof'}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-[#071f52]/8 pt-4 text-sm font-semibold text-[#071f52]/62">
                      <span>Recorded Payments</span>
                      <span className="font-black text-[#1f2a44] tabular-nums">{formatCurrency(paymentMadeAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyNote>No payments recorded.</EmptyNote>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Customer</h2>
              </div>

              <div className="px-6 py-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eff3f8] text-[#9aa7bb]">
                    <User className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-[1.05rem] font-black tracking-[-0.02em] text-[#1f2a44]">{customerName}</p>
                    <p className="text-sm font-medium text-[#071f52]/42">{customer ? 'Customer' : 'Guest booking'}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-[#4d5a72]">
                  <ContactRow icon={<Mail className="h-4 w-4" />} value={customer?.email || booking.guest_email || '—'} />
                  <ContactRow icon={<Phone className="h-4 w-4" />} value={customer?.mobile || booking.guest_mobile || '—'} />
                  {customerAddress ? <ContactRow icon={<MapPin className="h-4 w-4" />} value={customerAddress} /> : null}
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="flex items-center justify-between border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Documents</h2>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#eef2f8] px-2 text-xs font-bold text-[#071f52]/48">{documents.length + requested_document_types.length}</span>
              </div>

              <div className="px-6 py-6">
                <div className="space-y-5">
                  {requested_document_types.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#91a0b8]">Requested Documents</p>

                      {requested_document_types.map((type) => (
                        <div key={type.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#071f52]/8 bg-[#fbfcfe] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f46e5]">
                              <FileText className="h-4.5 w-4.5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#1f2a44]">{type.label}</p>
                              {type.upload ? (
                                <p className="truncate text-xs font-medium text-[#f59e0b]">{type.upload.original_filename || type.upload.file_path}</p>
                              ) : (
                                <p className="text-xs font-medium text-[#e92935]/70">Not uploaded</p>
                              )}
                            </div>
                          </div>

                          {type.upload ? (
                            <button type="button" onClick={() => handleViewDocument(type.upload!)} disabled={openingId === type.upload.id} className="shrink-0 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4] disabled:opacity-50">
                              {openingId === type.upload.id ? 'Opening...' : 'View'}
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#91a0b8]">Profile Documents</p>

                      {documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#071f52]/8 bg-[#fbfcfe] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf3] text-[#22c55e]">
                              <FileText className="h-4.5 w-4.5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#1f2a44]">{toLabel(document.document_type)}</p>
                              <p className="truncate text-xs font-medium text-[#f59e0b]">{document.original_filename || document.file_path}</p>
                            </div>
                          </div>

                          <button type="button" onClick={() => handleViewDocument(document)} disabled={openingId === document.id} className="shrink-0 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4] disabled:opacity-50">
                            {openingId === document.id ? 'Opening...' : 'View'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {documents.length === 0 && requested_document_types.length === 0 ? (
                    <EmptyNote>No documents on file.</EmptyNote>
                  ) : null}
                </div>
              </div>
            </section>

            {actions.length > 0 ? (
              <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
                <div className="border-b border-[#071f52]/8 px-6 py-5">
                  <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Actions</h2>
                </div>

                <div className={primaryActions.length === 0 && destructiveActions.length === 1 ? 'px-6 py-4' : 'px-6 py-6'}>
                  <div className="space-y-3">
                    {primaryActions.map((action) => (
                      <button
                        key={action.type}
                        type="button"
                        onClick={() => setActiveModal(action.type)}
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#071f52]/18 active:scale-[0.99]',
                          action.variant === 'primary' && 'bg-[#0a235e] text-white shadow-[0_10px_25px_rgba(7,31,82,0.18)] hover:bg-[#0d2d78]',
                          action.variant === 'secondary' && 'border border-[#071f52]/10 bg-[#f7f9fc] text-[#1f2a44] hover:bg-[#eef3fb]',
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {destructiveActions.length ? <div className="my-5 border-t border-[#071f52]/8" /> : null}

                  <div className="space-y-3">
                    {destructiveActions.map((action) => (
                      <button
                        key={action.type}
                        type="button"
                        onClick={() => setActiveModal(action.type)}
                        className="w-full rounded-2xl border border-[#efb6bc] bg-[#fff7f8] px-4 py-3 text-sm font-bold text-[#d43a4a] transition-all hover:bg-[#fff0f2] focus:outline-none focus:ring-2 focus:ring-[#d43a4a]/10 active:scale-[0.99]"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Status History</h2>
              </div>

              <div className="px-6 py-6">
                {status_events.length ? (
                  <div className="space-y-4">
                    {status_events.map((event) => (
                      <div key={event.id} className="relative pl-6">
                        <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#4f46e5]" />
                        <p className="text-sm font-bold text-[#1f2a44]">{event.from_status ? `${formatBookingStatus(event.from_status)} → ` : ''}{formatBookingStatus(event.to_status)}</p>
                        <p className="mt-1 text-xs font-medium text-[#071f52]/40">{formatDateTime(event.created_at)}</p>
                        {event.note ? <p className="mt-1 text-sm font-medium leading-6 text-[#071f52]/62">{event.note}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyNote>No status events.</EmptyNote>
                )}
              </div>
            </section>

            {extensions.length > 0 ? (
              <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
                <div className="border-b border-[#071f52]/8 px-6 py-5">
                  <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Extensions</h2>
                </div>

                <div className="px-6 py-6">
                  <div className="space-y-3">
                    {extensions.map((extension) => (
                      <div key={extension.id} className="rounded-[20px] border border-[#071f52]/8 bg-[#fbfcfe] px-4 py-4">
                        <p className="text-sm font-bold text-[#1f2a44]">Extended to {formatDateTime(extension.new_end_at)}</p>
                        {extension.extension_amount > 0 ? <p className="mt-1 text-sm font-semibold text-[#16a34a]">+{formatCurrency(extension.extension_amount)}</p> : null}
                        {extension.reason ? <p className="mt-2 text-sm font-medium text-[#071f52]/62">{extension.reason}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {canDownloadInvoice(booking.status) ? (
              <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
                <div className="border-b border-[#071f52]/8 px-6 py-5">
                  <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Invoice</h2>
                </div>

                <div className="px-6 py-6">
                  {invoice ? (
                    <>
                      <SummaryRow label="Invoice #" value={invoice.invoice_number} />
                      <SummaryRow label="Amount" value={formatCurrency(invoice.total_amount)} />
                      <SummaryRow label="Status" value={toLabel(invoice.status)} />
                    </>
                  ) : null}

                  <Button variant="outline" className="mt-3 w-full gap-1.5 text-xs" onClick={handleDownloadInvoice} disabled={isDownloadingInvoice}>
                    <FileText size={12} /> {isDownloadingInvoice ? 'Preparing...' : 'Download Invoice'}
                  </Button>
                </div>
              </section>
            ) : null}
          </aside>
        </div>

      {/* Modals */}
      <ConfirmModal open={activeModal === 'confirm'} onClose={() => setActiveModal(null)} onConfirm={handleConfirmBooking} isPending={bookingAction.isPending} />
      <RejectModal open={activeModal === 'reject'} onClose={() => setActiveModal(null)} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} onSubmit={handleRejectBooking} isPending={bookingAction.isPending} />
      <AdjustBookingModal open={activeModal === 'adjust_booking'} onClose={() => setActiveModal(null)} remainingBalance={booking.remaining_amount} currentTotal={displayedTotal} adjustmentType={modalForm.adjustmentType} setAdjustmentType={(adjustmentType) => setModalForm((current) => ({ ...current, adjustmentType }))} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} onSubmit={handleAdjustBooking} isPending={bookingAction.isPending} />
      <RequestDocsModal open={activeModal === 'request_documents'} onClose={() => setActiveModal(null)} onSubmit={handleRequestDocuments} isPending={bookingAction.isPending} />
       <StartTripModal open={activeModal === 'start_trip'} onClose={() => setActiveModal(null)} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} paymentMethodId={modalForm.paymentMethodId} setPaymentMethodId={(paymentMethodId) => setModalForm((current) => ({ ...current, paymentMethodId }))} paymentChannel={modalForm.paymentChannel} setPaymentChannel={(paymentChannel) => setModalForm((current) => ({ ...current, paymentChannel }))} referenceNumber={modalForm.referenceNumber} setReferenceNumber={(referenceNumber) => setModalForm((current) => ({ ...current, referenceNumber }))} receiptFile={modalForm.receiptFile} setReceiptFile={(receiptFile) => setModalForm((current) => ({ ...current, receiptFile }))} paymentMethods={paymentMethods} onSubmit={handleStartTrip} isPending={bookingAction.isPending} error={modalError} />
      <ExtendRentalModal open={activeModal === 'extend_rental'} onClose={() => setActiveModal(null)} newDate={modalForm.newDate} setNewDate={(newDate) => setModalForm((current) => ({ ...current, newDate }))} minimumDateTime={minimumExtensionDateTime ? new Date(minimumExtensionDateTime) : undefined} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} collectNow={modalForm.collectNow} setCollectNow={(collectNow) => setModalForm((current) => ({ ...current, collectNow }))} paymentMethodId={modalForm.paymentMethodId} setPaymentMethodId={(paymentMethodId) => setModalForm((current) => ({ ...current, paymentMethodId }))} paymentChannel={modalForm.paymentChannel} setPaymentChannel={(paymentChannel) => setModalForm((current) => ({ ...current, paymentChannel }))} referenceNumber={modalForm.referenceNumber} setReferenceNumber={(referenceNumber) => setModalForm((current) => ({ ...current, referenceNumber }))} receiptFile={modalForm.receiptFile} setReceiptFile={(receiptFile) => setModalForm((current) => ({ ...current, receiptFile }))} paymentMethods={paymentMethods} onSubmit={handleExtendBooking} isPending={bookingAction.isPending} isDateValid={isExtensionDateValid} />
      <CompleteModal open={activeModal === 'complete'} onClose={() => setActiveModal(null)} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} actualTollAmount={modalForm.actualTollAmount} setActualTollAmount={(actualTollAmount) => setModalForm((current) => ({ ...current, actualTollAmount }))} actualFuelAmount={modalForm.actualFuelAmount} setActualFuelAmount={(actualFuelAmount) => setModalForm((current) => ({ ...current, actualFuelAmount }))} requiresTripReconciliation={requiresTripReconciliation} tollEstimateAmount={Number(booking.toll_estimate_amount || 0)} fuelEstimateAmount={Number(booking.fuel_estimate_amount || 0)} paymentMethodId={modalForm.paymentMethodId} setPaymentMethodId={(paymentMethodId) => setModalForm((current) => ({ ...current, paymentMethodId }))} paymentChannel={modalForm.paymentChannel} setPaymentChannel={(paymentChannel) => setModalForm((current) => ({ ...current, paymentChannel }))} referenceNumber={modalForm.referenceNumber} setReferenceNumber={(referenceNumber) => setModalForm((current) => ({ ...current, referenceNumber }))} receiptFile={modalForm.receiptFile} setReceiptFile={(receiptFile) => setModalForm((current) => ({ ...current, receiptFile }))} paymentMethods={paymentMethods} onSubmit={handleCompleteBooking} isPending={bookingAction.isPending} />
       <PaymentModal open={activeModal === 'make_payment'} onClose={() => setActiveModal(null)} title="Make a Payment" description="Record a post-trip payment for this completed booking." submitLabel="Record Payment" amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} paymentMethodId={modalForm.paymentMethodId} setPaymentMethodId={(paymentMethodId) => setModalForm((current) => ({ ...current, paymentMethodId }))} paymentChannel={modalForm.paymentChannel} setPaymentChannel={(paymentChannel) => setModalForm((current) => ({ ...current, paymentChannel }))} referenceNumber={modalForm.referenceNumber} setReferenceNumber={(referenceNumber) => setModalForm((current) => ({ ...current, referenceNumber }))} receiptFile={modalForm.receiptFile} setReceiptFile={(receiptFile) => setModalForm((current) => ({ ...current, receiptFile }))} paymentMethods={paymentMethods} onSubmit={handleMakePayment} isPending={bookingAction.isPending} error={modalError} />
        <PaymentModal open={activeModal === 'process_refund'} onClose={() => setActiveModal(null)} title="Process Refund" description="Refund the security deposit and attach image proof if available." submitLabel="Process Refund" amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} paymentMethodId={modalForm.paymentMethodId} setPaymentMethodId={(paymentMethodId) => setModalForm((current) => ({ ...current, paymentMethodId }))} paymentChannel={modalForm.paymentChannel} setPaymentChannel={(paymentChannel) => setModalForm((current) => ({ ...current, paymentChannel }))} referenceNumber={modalForm.referenceNumber} setReferenceNumber={(referenceNumber) => setModalForm((current) => ({ ...current, referenceNumber }))} receiptFile={modalForm.receiptFile} setReceiptFile={(receiptFile) => setModalForm((current) => ({ ...current, receiptFile }))} paymentMethods={paymentMethods} onSubmit={handleProcessRefund} isPending={bookingAction.isPending} error={modalError} amountLabel="Amount Refunded" refundMode maxAmount={depositAmount} />
       <CancelModal open={activeModal === 'cancel'} onClose={() => setActiveModal(null)} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} onSubmit={(cancellationType) => runAction({ type: 'cancel', bookingId: booking.id, cancellationType, reason: modalForm.reason.trim() }, 'Booking canceled.')} isPending={bookingAction.isPending} />
       <RefundCancelModal open={activeModal === 'cancel_refund'} onClose={() => setActiveModal(null)} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} onSubmit={() => runAction({ type: 'cancel_refund', bookingId: booking.id, reason: modalForm.reason.trim() }, 'Refund canceled.')} isPending={bookingAction.isPending} />
      <DeleteModal open={activeModal === 'delete'} onClose={() => setActiveModal(null)} onSubmit={handleDeleteBooking} isPending={bookingAction.isPending} />
      <SetPriceModal open={activeModal === 'set_price_for_manual'} onClose={() => setActiveModal(null)} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} onSubmit={handleSetManualPrice} isPending={bookingAction.isPending} />
      <ImageViewer open={!!viewing} onClose={closeViewer} src={viewing?.src || ''} alt={viewing?.alt || ''} />
      </div>
    </main>
  )
}

function ConfirmModal({ open, onClose, onConfirm, isPending }: { open: boolean; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title="Confirm Booking">
      <p className="text-sm text-[#071f52]/70">Are you sure you want to confirm this booking? All requirements will be marked as verified.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold bg-[#16a34a] text-white hover:bg-[#16a34a]/90 disabled:opacity-50">{isPending ? 'Confirming...' : 'Confirm'}</button>
      </div>
    </Dialog>
  )
}

function RejectModal({ open, onClose, reason, setReason, onSubmit, isPending }: { open: boolean; onClose: () => void; reason: string; setReason: (v: string) => void; onSubmit: () => void; isPending: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title="Reject Booking">
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reason (required)</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Tell the customer why the booking is being rejected" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || !reason.trim()} className="rounded-full px-4 py-2 text-xs font-bold bg-[#e92935] text-white hover:bg-[#e92935]/90 disabled:opacity-50">{isPending ? 'Rejecting...' : 'Reject Booking'}</button>
      </div>
    </Dialog>
  )
}

function AdjustBookingModal({ open, onClose, remainingBalance, currentTotal, adjustmentType, setAdjustmentType, reason, setReason, amount, setAmount, onSubmit, isPending }: { open: boolean; onClose: () => void; remainingBalance: number; currentTotal: number; adjustmentType: 'increase' | 'decrease'; setAdjustmentType: (v: 'increase' | 'decrease') => void; reason: string; setReason: (v: string) => void; amount: string; setAmount: (v: string) => void; onSubmit: () => void; isPending: boolean }) {
  const adjustmentAmount = Number(amount || 0)
  const signedAdjustmentAmount = adjustmentType === 'decrease' ? -adjustmentAmount : adjustmentAmount
  const nextTotal = currentTotal + signedAdjustmentAmount
  const nextRemainingBalance = remainingBalance + signedAdjustmentAmount
  const note = adjustmentType === 'increase'
    ? 'Customer must approve the addition within the deadline before booking confirms.'
    : 'Discount - booking will be automatically confirmed immediately.'
  const amountError = !amount
    ? 'Enter an adjustment amount.'
    : adjustmentAmount <= 0
      ? 'Adjustment amount must be greater than 0.'
      : adjustmentAmount > MAX_BOOKING_ADJUSTMENT
        ? `Adjustment amount cannot exceed ${formatCurrency(MAX_BOOKING_ADJUSTMENT)}.`
      : nextTotal < 0
        ? 'Adjusted total cannot be below 0.'
        : nextRemainingBalance < 0
          ? 'New remaining balance cannot be below 0.'
          : null
  const reasonError = !reason.trim() ? 'Reason for adjustment is required.' : null

  return (
    <Dialog open={open} onClose={onClose} title="Confirm with Adjustment">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-[#4f46e5]">{note}</p>

        <div className="rounded-2xl border border-[#071f52]/12 bg-[#f8fafc] px-4 py-3">
          <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#4d5a72]">
            <span>Remaining Balance</span>
            <span className="text-[#1f2a44]">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4d5a72]">Adjusted Total (₱) <span className="text-[#ef4444]">*</span></label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAdjustmentType('increase')} className={cn('flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-bold transition', adjustmentType === 'increase' ? 'border-[#4f46e5] bg-[#4f46e5] text-white' : 'border-[#d9dfeb] bg-[#f8fafc] text-[#4d5a72] hover:bg-[#eef2ff]')}>+</button>
            <button type="button" onClick={() => setAdjustmentType('decrease')} className={cn('flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-bold transition', adjustmentType === 'decrease' ? 'border-[#4f46e5] bg-[#4f46e5] text-white' : 'border-[#d9dfeb] bg-[#f8fafc] text-[#4d5a72] hover:bg-[#eef2ff]')}>-</button>
            <input type="number" min="0" max={MAX_BOOKING_ADJUSTMENT} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={cn('h-10 flex-1 rounded-xl border px-3 text-sm text-[#1f2a44] focus:outline-none', amountError ? 'border-[#ef4444] focus:border-[#ef4444]' : 'border-[#d9dfeb] focus:border-[#4f46e5]')} />
          </div>
          {amountError ? <p className="mt-2 text-sm font-medium text-[#dc2626]">{amountError}</p> : null}
        </div>

        <div className="rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3">
          <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#4f46e5]">
            <span>New Remaining Balance</span>
            <span>{formatCurrency(nextRemainingBalance)}</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4d5a72]">Reason for adjustment <span className="text-[#ef4444]">*</span></label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="e.g. Location surcharge for out-of-city delivery..." className={cn('w-full rounded-2xl border px-4 py-3 text-sm text-[#1f2a44] placeholder:text-[#9aa6ba] focus:outline-none', reasonError ? 'border-[#ef4444] focus:border-[#ef4444]' : 'border-[#d9dfeb] focus:border-[#4f46e5]')} />
          {reasonError ? <p className="mt-2 text-sm font-medium text-[#dc2626]">{reasonError}</p> : null}
        </div>

        <div className="-mx-6 flex gap-3 border-t border-[#071f52]/8 px-6 pt-4">
          <button onClick={onClose} disabled={isPending} className="flex-1 rounded-full border border-[#d9dfeb] px-4 py-2.5 text-sm font-semibold text-[#4d5a72] hover:bg-[#f8fafc] disabled:opacity-50">Cancel</button>
          <button onClick={onSubmit} disabled={isPending || Boolean(reasonError) || Boolean(amountError)} className="flex-1 rounded-full bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50">{isPending ? 'Saving...' : 'Confirm Adjustment'}</button>
        </div>
      </div>
    </Dialog>
  )
}

function SetPriceModal({ open, onClose, amount, setAmount, reason, setReason, onSubmit, isPending }: { open: boolean; onClose: () => void; amount: string; setAmount: (v: string) => void; reason: string; setReason: (v: string) => void; onSubmit: () => void; isPending: boolean }) {
  const priceAmount = Number(amount || 0)
  const amountError = !amount ? 'Enter a price.' : priceAmount <= 0 ? 'Price must be greater than 0.' : null
  const reasonError = !reason.trim() ? 'Reason is required.' : null

  return (
    <Dialog open={open} onClose={onClose} title="Set Manual Price">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/8 px-4 py-3">
          <p className="text-sm font-bold text-[#92400e]">Manual Pricing</p>
          <p className="mt-1 text-xs font-medium text-[#92400e]/80">Enter the pre-VAT price. VAT will be calculated on the final total when the trip is completed.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4d5a72]">Price (₱) <span className="text-[#ef4444]">*</span></label>
          <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={cn('h-10 w-full rounded-xl border px-3 text-sm text-[#1f2a44] focus:outline-none', amountError ? 'border-[#ef4444] focus:border-[#ef4444]' : 'border-[#d9dfeb] focus:border-[#4f46e5]')} />
          {amountError ? <p className="mt-2 text-sm font-medium text-[#dc2626]">{amountError}</p> : null}
          {priceAmount > 0 ? <p className="mt-2 text-xs font-semibold text-[#4d5a72]">Pre-VAT total: ₱{priceAmount.toLocaleString()}.00</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4d5a72]">Reason <span className="text-[#ef4444]">*</span></label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Out-of-area surcharge, distance-based fare..." className={cn('w-full rounded-2xl border px-4 py-3 text-sm text-[#1f2a44] placeholder:text-[#9aa6ba] focus:outline-none', reasonError ? 'border-[#ef4444] focus:border-[#ef4444]' : 'border-[#d9dfeb] focus:border-[#4f46e5]')} />
          {reasonError ? <p className="mt-2 text-sm font-medium text-[#dc2626]">{reasonError}</p> : null}
        </div>

        <div className="-mx-6 flex gap-3 border-t border-[#071f52]/8 px-6 pt-4">
          <button onClick={onClose} disabled={isPending} className="flex-1 rounded-full border border-[#d9dfeb] px-4 py-2.5 text-sm font-semibold text-[#4d5a72] hover:bg-[#f8fafc] disabled:opacity-50">Cancel</button>
          <button onClick={onSubmit} disabled={isPending || Boolean(reasonError) || Boolean(amountError)} className="flex-1 rounded-full bg-[#e92935] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#dc2626] disabled:opacity-50">{isPending ? 'Saving...' : 'Set Price'}</button>
        </div>
      </div>
    </Dialog>
  )
}

function RequestDocsModal({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (labels: string[]) => void; isPending: boolean }) {
  const [labels, setLabels] = useState<string[]>([''])

  const setLabel = (index: number, value: string) => {
    setLabels((prev) => prev.map((label, i) => (i === index ? value : label)))
  }

  const addLabel = () => setLabels((prev) => [...prev, ''])
  const removeLabel = (index: number) => setLabels((prev) => prev.filter((_, i) => i !== index))

  const validLabels = labels.map((l) => l.trim()).filter(Boolean)

  const handleSubmit = () => {
    if (validLabels.length === 0) return
    onSubmit(validLabels)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Request Documents">
      <div className="space-y-2">
        {labels.map((label, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(index, e.target.value)}
              placeholder="e.g. Valid ID"
              className="flex-1 rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none"
            />
            {labels.length > 1 ? (
              <button type="button" onClick={() => removeLabel(index)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e92935]/30 text-[#e92935] hover:bg-[#e92935]/8">−</button>
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" onClick={addLabel} className="mt-2 flex items-center gap-1 text-xs font-bold text-[#4f46e5] hover:text-[#3639d4]">+ Add another document</button>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={handleSubmit} disabled={isPending || validLabels.length === 0} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90 disabled:opacity-50">{isPending ? 'Sending...' : 'Send Request'}</button>
      </div>
    </Dialog>
  )
}

function StartTripModal({ open, onClose, amount, setAmount, paymentMethodId, setPaymentMethodId, paymentChannel, setPaymentChannel, referenceNumber, setReferenceNumber, receiptFile, setReceiptFile, paymentMethods, onSubmit, isPending, error }: { open: boolean; onClose: () => void; amount: string; setAmount: (v: string) => void; paymentMethodId: string; setPaymentMethodId: (v: string) => void; paymentChannel: string; setPaymentChannel: (v: string) => void; referenceNumber: string; setReferenceNumber: (v: string) => void; receiptFile: File | null; setReceiptFile: (file: File | null) => void; paymentMethods: Array<{ id: string; provider: string; channel: string }>; onSubmit: () => void; isPending: boolean; error: string }) {
  return (
    <Dialog open={open} onClose={onClose} title="Release Unit / Start Trip">
      {error ? <p role="alert" className="mb-3 rounded-xl border border-[#efb6bc] bg-[#fff7f8] px-3 py-2 text-sm font-semibold text-[#d43a4a]">{error}</p> : null}
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Remaining Balance Collected</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the amount collected" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Account</label>
      <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
        {paymentMethods.map((method) => (
          <option key={method.id} value={method.id}>{method.provider}</option>
        ))}
      </select>
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Method</label>
      <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="ewallet">E-Wallet</option>
      </select>
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reference Number (optional)</label>
      <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Reference number or official receipt" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Upload Receipt (optional)</label>
      <input type="file" accept={UPLOAD_POLICIES.paymentReceipts.accept} onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      {receiptFile ? <p className="mt-2 text-xs font-medium text-[#071f52]/48">{receiptFile.name}</p> : null}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || !amount} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90 disabled:opacity-50">{isPending ? 'Starting...' : 'Start Trip'}</button>
      </div>
    </Dialog>
  )
}

function ExtendRentalModal({ open, onClose, newDate, setNewDate, minimumDateTime, amount, setAmount, reason, setReason, collectNow, setCollectNow, paymentMethodId, setPaymentMethodId, paymentChannel, setPaymentChannel, referenceNumber, setReferenceNumber, receiptFile, setReceiptFile, paymentMethods, onSubmit, isPending, isDateValid }: { open: boolean; onClose: () => void; newDate: string; setNewDate: (v: string) => void; minimumDateTime?: Date; amount: string; setAmount: (v: string) => void; reason: string; setReason: (v: string) => void; collectNow: boolean; setCollectNow: (v: boolean) => void; paymentMethodId: string; setPaymentMethodId: (v: string) => void; paymentChannel: string; setPaymentChannel: (v: string) => void; referenceNumber: string; setReferenceNumber: (v: string) => void; receiptFile: File | null; setReceiptFile: (file: File | null) => void; paymentMethods: Array<{ id: string; provider: string; channel: string }>; onSubmit: () => void; isPending: boolean; isDateValid: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title="Extend Rental">
      <DateTimePicker id="extend-rental-new-return-date" label="New Return Date" value={newDate} onChange={setNewDate} placeholder="Select the new return date & time" labelClassName="block text-xs font-bold text-[#071f52]/48" triggerClassName="min-h-[42px] rounded-xl bg-white px-3 py-2 text-sm mb-3" minDateTime={minimumDateTime} />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Extension Charge</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the extension charge" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reason (optional)</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional note for the extension" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <fieldset className="mb-3">
        <legend className="block text-xs font-bold text-[#071f52]/48 mb-2">How is the charge handled?</legend>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#071f52]">
          <input type="radio" name="collect-now" checked={collectNow} onChange={() => setCollectNow(true)} />
          Collect payment now
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-[#071f52]">
          <input type="radio" name="collect-now" checked={!collectNow} onChange={() => setCollectNow(false)} />
          Add to outstanding balance
        </label>
      </fieldset>
      {collectNow ? (
        <>
          <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Account</label>
          <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>{method.provider}</option>
            ))}
          </select>
          <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Method</label>
          <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="ewallet">E-Wallet</option>
          </select>
          <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reference Number (optional)</label>
          <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Reference number or official receipt" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
          <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Upload Receipt (optional)</label>
          <input type="file" accept={UPLOAD_POLICIES.paymentReceipts.accept} onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
          {receiptFile ? <p className="mt-2 text-xs font-medium text-[#071f52]/48">{receiptFile.name}</p> : null}
        </>
      ) : null}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || !newDate || !amount || !isDateValid} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90 disabled:opacity-50">{isPending ? 'Extending...' : 'Extend'}</button>
      </div>
    </Dialog>
  )
}

function CompleteModal({ open, onClose, amount, setAmount, actualTollAmount, setActualTollAmount, actualFuelAmount, setActualFuelAmount, requiresTripReconciliation, tollEstimateAmount, fuelEstimateAmount, paymentMethodId, setPaymentMethodId, paymentChannel, setPaymentChannel, referenceNumber, setReferenceNumber, receiptFile, setReceiptFile, paymentMethods, onSubmit, isPending }: { open: boolean; onClose: () => void; amount: string; setAmount: (v: string) => void; actualTollAmount: string; setActualTollAmount: (v: string) => void; actualFuelAmount: string; setActualFuelAmount: (v: string) => void; requiresTripReconciliation: boolean; tollEstimateAmount: number; fuelEstimateAmount: number; paymentMethodId: string; setPaymentMethodId: (v: string) => void; paymentChannel: string; setPaymentChannel: (v: string) => void; referenceNumber: string; setReferenceNumber: (v: string) => void; receiptFile: File | null; setReceiptFile: (file: File | null) => void; paymentMethods: Array<{ id: string; provider: string; channel: string }>; onSubmit: () => void; isPending: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title="Mark as Returned">
      <p className="mb-3 text-sm text-[#071f52]/70">Record any final payment collected before completing this booking. Leave the amount blank if nothing was collected on return.</p>
      {requiresTripReconciliation ? (
        <div className="mb-4 rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4f46e5]">Trip Reconciliation</p>
          <p className="mt-2 text-sm font-medium text-[#4d5a72]">All-in keep trips need the actual toll and gas before completion.</p>
          <p className="mt-2 text-sm font-semibold text-[#1f2a44]">Estimated Toll {formatCurrency(tollEstimateAmount)} · Estimated Gas {formatCurrency(fuelEstimateAmount)}</p>
        </div>
      ) : null}
      {requiresTripReconciliation ? (
        <>
          <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Actual Toll</label>
          <input type="number" value={actualTollAmount} onChange={(e) => setActualTollAmount(e.target.value)} placeholder="Enter the actual toll" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
          <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Actual Gas</label>
          <input type="number" value={actualFuelAmount} onChange={(e) => setActualFuelAmount(e.target.value)} placeholder="Enter the actual gas" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
        </>
      ) : null}
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Remaining Balance Collected</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the amount collected" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Account</label>
      <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
        {paymentMethods.map((method) => (
          <option key={method.id} value={method.id}>{method.provider}</option>
        ))}
      </select>
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Method</label>
      <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="ewallet">E-Wallet</option>
      </select>
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reference Number (optional)</label>
      <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Reference number or official receipt" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Upload Receipt (optional)</label>
          <input type="file" accept={UPLOAD_POLICIES.paymentReceipts.accept} onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      {receiptFile ? <p className="mt-2 text-xs font-medium text-[#071f52]/48">{receiptFile.name}</p> : null}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || (requiresTripReconciliation && (!actualTollAmount || !actualFuelAmount))} className="rounded-full px-4 py-2 text-xs font-bold bg-[#16a34a] text-white hover:bg-[#16a34a]/90 disabled:opacity-50">{isPending ? 'Completing...' : 'Complete'}</button>
      </div>
    </Dialog>
  )
}

function PaymentModal({ open, onClose, title, description, submitLabel, amount, setAmount, paymentMethodId, setPaymentMethodId, paymentChannel, setPaymentChannel, referenceNumber, setReferenceNumber, receiptFile, setReceiptFile, paymentMethods, onSubmit, isPending, error, amountLabel = 'Amount Collected', refundMode = false, maxAmount }: { open: boolean; onClose: () => void; title: string; description: string; submitLabel: string; amount: string; setAmount: (v: string) => void; paymentMethodId: string; setPaymentMethodId: (v: string) => void; paymentChannel: string; setPaymentChannel: (v: string) => void; referenceNumber: string; setReferenceNumber: (v: string) => void; receiptFile: File | null; setReceiptFile: (file: File | null) => void; paymentMethods: Array<{ id: string; provider: string; channel: string }>; onSubmit: () => void; isPending: boolean; error: string; amountLabel?: string; refundMode?: boolean; maxAmount?: number }) {
  const amountValue = Number(amount || 0)
  const amountError = !refundMode && maxAmount !== undefined && amountValue > maxAmount ? `Amount cannot exceed ${formatCurrency(maxAmount)}.` : null
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mb-3 text-sm text-[#071f52]/70">{description}</p>
      {error ? <p role="alert" className="mb-3 rounded-xl border border-[#efb6bc] bg-[#fff7f8] px-3 py-2 text-sm font-semibold text-[#d43a4a]">{error}</p> : null}
       {refundMode && maxAmount !== undefined ? <p className="mb-3 rounded-xl bg-[#f7f9fc] px-3 py-2 text-sm font-semibold text-[#4d5a72]">Amount refunded: {formatCurrency(maxAmount)}</p> : <>
         <label className="block text-xs font-bold text-[#071f52]/48 mb-1">{amountLabel}</label>
         <input type="number" min="0.01" max={maxAmount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the amount collected" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
       </>}
       {amountError ? <p className="-mt-1 mb-3 text-sm font-medium text-[#dc2626]">{amountError}</p> : null}
       {!refundMode ? <>
         <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Account</label>
         <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
           {paymentMethods.map((method) => (
             <option key={method.id} value={method.id}>{method.provider}</option>
           ))}
         </select>
         <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Method</label>
         <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
           <option value="cash">Cash</option>
           <option value="bank_transfer">Bank Transfer</option>
           <option value="ewallet">E-Wallet</option>
         </select>
         <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reference Number (optional)</label>
         <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Reference number or official receipt" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
       </> : null}
       <label className="block text-xs font-bold text-[#071f52]/48 mb-1">{refundMode ? 'Image Proof (optional)' : 'Upload Receipt (optional)'}</label>
           <input type="file" accept={refundMode ? 'image/jpeg,image/png,image/webp' : UPLOAD_POLICIES.paymentReceipts.accept} onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      {receiptFile ? <p className="mt-2 text-xs font-medium text-[#071f52]/48">{receiptFile.name}</p> : null}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || (!refundMode && !amount) || Boolean(amountError)} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90 disabled:opacity-50">{isPending ? 'Saving...' : submitLabel}</button>
      </div>
    </Dialog>
  )
}

function RefundCancelModal({ open, onClose, reason, setReason, onSubmit, isPending }: { open: boolean; onClose: () => void; reason: string; setReason: (v: string) => void; onSubmit: () => void; isPending: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cancel Refund">
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-semibold text-[#4d5a72]">Refund decision <span className="text-[#ef4444]">*</span></legend>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm font-medium text-[#4d5a72]">
            <input type="radio" checked readOnly className="mt-0.5 h-4 w-4 border-[#cfd7e6] text-[#ef4444] focus:ring-[#ef4444]/20" />
            <span>Cancel refund due to fraud or an invalid refund claim</span>
          </label>
        </fieldset>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4d5a72]">Reason <span className="text-[#ef4444]">*</span></label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Reason for canceling the refund..." className="w-full rounded-2xl border border-[#d9dfeb] px-4 py-3 text-sm text-[#1f2a44] placeholder:text-[#9aa6ba] focus:border-[#071f52] focus:outline-none" />
        </div>
      </div>
      <div className="-mx-6 mt-6 flex gap-3 border-t border-[#071f52]/8 px-6 pt-4">
        <button onClick={onClose} disabled={isPending} className="flex-1 rounded-2xl border border-[#d7ddea] px-4 py-3 text-sm font-bold text-[#4d5a72] transition-colors hover:bg-[#f7f9fc] disabled:opacity-50">Back</button>
        <button onClick={onSubmit} disabled={isPending || !reason.trim()} className="flex-1 rounded-2xl bg-[#ef1111] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d90f0f] disabled:opacity-50">{isPending ? 'Canceling...' : 'Cancel Refund'}</button>
      </div>
    </Dialog>
  )
}

function CancelModal({ open, onClose, reason, setReason, onSubmit, isPending }: { open: boolean; onClose: () => void; reason: string; setReason: (v: string) => void; onSubmit: (cancellationType: string) => void; isPending: boolean }) {
  const [cancelType, setCancelType] = useState('customer_request')

  const options = [
    { value: 'admin_no_refund', label: 'Admin cancellation - no refund' },
    { value: 'customer_request', label: `${formatCancellationType('customer_request')} - no refund` },
  ]

  return (
    <Dialog open={open} onClose={onClose} title="Cancel Booking">
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-semibold text-[#4d5a72]">Cancellation type <span className="text-[#ef4444]">*</span></legend>
          <div className="mt-3 space-y-2.5">
            {options.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-start gap-3 text-sm font-medium text-[#4d5a72]">
                <input
                  type="radio"
                  name="cancel-type"
                  value={option.value}
                  checked={cancelType === option.value}
                  onChange={(event) => setCancelType(event.target.value)}
                  className="mt-0.5 h-4 w-4 border-[#cfd7e6] text-[#ef4444] focus:ring-[#ef4444]/20"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4d5a72]">Cancellation reason <span className="text-[#ef4444]">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Reason for cancellation..."
            className="w-full rounded-2xl border border-[#d9dfeb] px-4 py-3 text-sm text-[#1f2a44] placeholder:text-[#9aa6ba] focus:border-[#071f52] focus:outline-none"
          />
        </div>
      </div>

      <div className="-mx-6 mt-6 flex gap-3 border-t border-[#071f52]/8 px-6 pt-4">
        <button onClick={onClose} disabled={isPending} className="flex-1 rounded-2xl border border-[#d7ddea] px-4 py-3 text-sm font-bold text-[#4d5a72] transition-colors hover:bg-[#f7f9fc] disabled:opacity-50">Back</button>
        <button onClick={() => onSubmit(cancelType)} className="flex-1 rounded-2xl bg-[#ef1111] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d90f0f] disabled:opacity-50" disabled={isPending || !reason.trim()}>{isPending ? 'Canceling...' : 'Confirm Cancel'}</button>
      </div>
    </Dialog>
  )
}


function DeleteModal({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: () => void; isPending: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title="Delete Booking">
      <p className="text-sm text-[#e92935] font-bold">Warning: This will permanently delete this booking. This action cannot be undone.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6 disabled:opacity-50">Cancel</button>
        <button onClick={onSubmit} disabled={isPending} className="rounded-full px-4 py-2 text-xs font-bold bg-[#e92935] text-white hover:bg-[#e92935]/90 disabled:opacity-50">{isPending ? 'Deleting...' : 'Delete Forever'}</button>
      </div>
    </Dialog>
  )
}

function SummaryRow({
  label,
  value,
  strong = false,
  note,
  valueClassName,
}: {
  label: string
  value: string
  strong?: boolean
  note?: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="text-sm text-[#071f52]/62">
        <span className={cn(strong && 'font-bold text-[#1f2a44]')}>{label}</span>
        {note ? <span className="ml-1 text-xs text-[#91a0b8]">{note}</span> : null}
      </div>
      <span className={cn('text-sm font-bold text-[#1f2a44] tabular-nums', strong && 'text-[1.05rem] font-black', valueClassName)}>{value}</span>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#97a5bb]">{label}</p>
      <p className="mt-2 text-[1.02rem] font-bold leading-6 text-[#1f2a44]">{value}</p>
    </div>
  )
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#91a0b8]">{icon}</span>
      <span className="font-medium leading-6">{value}</span>
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-[#f7f9fc] px-4 py-4 text-sm font-medium text-[#071f52]/52">
      {children}
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0)).replace('PHP', '₱')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateRange(startAt: string, endAt: string | null) {
  const start = new Date(startAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  const end = endAt ? new Date(endAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  return `${start} – ${end}`
}

function getExtensionChargeLabel(days: number) {
  return days > 0 ? `Extension Charge (${days} day${days === 1 ? '' : 's'})` : 'Extension Charge'
}

function getMinimumExtensionDateTime(value?: string | null) {
  if (!value) return undefined

  return value.slice(0, 16)
}

function formatBookingMode(mode?: string) {
  if (mode === 'dropoff') return 'Just a Drop Off'
  if (mode === 'keep') return 'Keep the Car'
  return '—'
}

function toLabel(value: string) {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatCancellationReason(note?: string | null) {
  if (!note) return 'No cancellation reason recorded.'

  const match = note.match(/^Type:\s*(.+?)\.\s*Reason:\s*(.+)$/i)
  if (!match) return note

  const [, rawType, rawReason] = match
  const type = rawType.trim()
  const reason = rawReason.trim()

  const label = (() => {
    switch (type) {
      case 'customer_request':
        return 'Canceled at the customer\'s request'
      case 'admin_no_refund':
        return 'Canceled by admin without a refund'
      default:
        return `Canceled: ${formatCancellationType(type)}`
    }
  })()

  return reason ? `${label}. Reason: ${reason}` : label
}

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(', ')
}

function getStatusTone(status: string) {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return {
        wrapper: 'border-[#bbf7d0] bg-[#f0fdf4]',
        icon: 'text-[#16a34a]',
        text: 'text-[#166534]',
      }
    case 'rejected':
    case 'canceled':
      return {
        wrapper: 'border-[#fecdd3] bg-[#fff1f2]',
        icon: 'text-[#e11d48]',
        text: 'text-[#9f1239]',
      }
    default:
      return {
        wrapper: 'border-[#c7d2fe] bg-[#eef2ff]',
        icon: 'text-[#4f46e5]',
        text: 'text-[#3730a3]',
      }
  }
}

function getStatusMessage(status: string, rejectionReason?: string | null, cancellationReason?: string | null) {
  switch (status) {
    case 'for_review':
      return {
        title: 'Pending review',
        body: 'Check the booking details, payment proof, and required documents before moving this booking forward.',
      }
    case 'awaiting_documents':
      return {
        title: 'Awaiting customer documents',
        body: 'The booking is paused until the missing customer files are uploaded and verified.',
      }
    case 'confirmed':
      return {
        title: 'Ready for release',
        body: 'This booking is confirmed. Collect any remaining balance before releasing the unit.',
      }
    case 'pending_price_approval':
      return {
        title: 'Pending price approval',
        body: 'The customer needs to review the updated price before this booking can move forward.',
      }
    case 'on_trip':
      return {
        title: 'Trip in progress',
        body: 'The vehicle is currently on trip. Extensions and return handling can be managed from this page.',
      }
    case 'completed':
      return {
        title: 'Trip completed',
        body: 'This booking is complete and can now be retained only for records, invoicing, and audit history.',
      }
    case 'rejected':
      return {
        title: 'Booking rejected',
        body: rejectionReason ? `Rejected Reason: ${rejectionReason}` : 'No rejection reason recorded.',
      }
    case 'canceled':
      return {
        title: 'Booking canceled',
        body: formatCancellationReason(cancellationReason),
      }
    default:
      return {
        title: 'Booking status',
        body: 'Review the booking information below and use the available actions when you are ready.',
      }
  }
}
