import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { useAcceptOwnPriceAdjustment, useBooking, useCancelOwnBooking } from '@/hooks/use-bookings'
import { useFileViewer } from '@/hooks/use-file-viewer'
import { saveBookingRequestedDocument, deleteBookingRequestedDocument, getCustomerDocumentSignedUrl } from '@/services/document-service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageViewer } from '@/components/ui/image-viewer'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Receipt,
  Send,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import { BOOKING_MESSAGES } from '@/constants/booking'
import { STATUS_COLORS } from '@/config/constants'
import { getBookingAdjustmentSummary } from '@/lib/booking-adjustment'
import { getDisplayBookingNote } from '@/lib/booking-notes'
import { canCustomerCancelBooking, formatBookingStatus, getBookingCadenceLabel, getBookingCadenceValue } from '@/lib/booking-utils'
import { downloadBookingInvoicePdf } from '@/lib/invoice-pdf'
import { toast } from '@/lib/toast'
import { showError } from '@/lib/errors'

const TIMELINE_STATUSES = ['for_review', 'awaiting_documents', 'confirmed', 'on_trip', 'completed']
const PAYMENT_RECEIPT_BUCKET = 'payment-receipts'

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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data, isLoading: loading, refetch: refetchBooking } = useBooking(id)
  const cancelBooking = useCancelOwnBooking()
  const acceptPriceAdjustment = useAcceptOwnPriceAdjustment()
  const { viewing, openingId, openFile, closeViewer } = useFileViewer((viewError) => {
    toast.error(showError(viewError))
  })

  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)
  const [adjustmentAction, setAdjustmentAction] = useState<'accept' | 'cancel' | null>(null)
  const [uploadingTypeId, setUploadingTypeId] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const oldUploadRef = useRef<{ file_path: string; original_filename: string; mime_type: string; size_bytes: number } | null>(null)
  const uploadHandledRef = useRef(false)
  const hasSubmittedFeedback = submitted || Boolean(data?.feedback)

  useEffect(() => {
    const el = docInputRef.current
    if (!el) return
    el.oncancel = () => setUploadingTypeId(null)
  })

  useEffect(() => {
    if (!uploadingTypeId) return
    const onFocus = () => {
      setTimeout(() => {
        if (!uploadHandledRef.current) setUploadingTypeId(null)
      }, 300)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [uploadingTypeId])
  const [dragOver, setDragOver] = useState(false)
  const docInputRef = useRef<HTMLInputElement>(null)

  const handleCancelBooking = async () => {
    if (!data) return

    const reason = window.prompt('Why are you canceling this booking?', 'Customer requested cancellation')
    if (reason === null) return

    setAdjustmentAction('cancel')

    try {
      await cancelBooking.mutateAsync({ id: data.booking.id, reason: reason.trim() || 'Customer requested cancellation' })
      toast.success('Booking canceled.')
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setAdjustmentAction(null)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!data || !user) return

    const { error } = await supabase.from('booking_feedback').insert({
      booking_id: data.booking.id,
      customer_id: user.id,
      vehicle_id: data.booking.vehicle_id,
      rating,
      feedback: feedback || null,
    })

    if (!error) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 5000)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!data) return

    setIsDownloadingInvoice(true)

    try {
      await downloadBookingInvoicePdf(data.booking.id)
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setIsDownloadingInvoice(false)
    }
  }

  const getPaymentReceiptSignedUrl = async (path: string) => {
    for (const candidate of getPaymentReceiptPathCandidates(path)) {
      const { data, error } = await supabase.storage.from(PAYMENT_RECEIPT_BUCKET).createSignedUrl(candidate, 3600)
      if (!error && data?.signedUrl) return data.signedUrl
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

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f9ff] animate-pulse">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 space-y-6">
          <div className="h-4 w-24 rounded-lg bg-[#071f52]/10" />
          <div className="h-40 rounded-[30px] bg-[#071f52]/6" />
          <div className="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-[26px] bg-[#071f52]/6" />)}
            </div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-[26px] bg-[#071f52]/6" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f9ff]">
        <p className="text-lg font-bold text-[#071f52]">Booking not found</p>
      </div>
    )
  }

  const { booking, vehicle, payments, status_events, cancellation, extensions, invoice, requested_document_types = [] } = data
  const adminRequestSentAt = booking.status === 'awaiting_documents'
    ? status_events.find((e) => e.to_status === 'awaiting_documents')?.created_at || null
    : null
  const timelineIdx = TIMELINE_STATUSES.indexOf(booking.status)
  const rejectionReason = booking.status === 'rejected'
    ? status_events.find((event) => event.to_status === 'rejected' && event.note)?.note || null
    : null
  const cancellationReason = booking.status === 'canceled'
    ? cancellation?.reason ? `Type: ${cancellation.cancellation_type}. Reason: ${cancellation.reason}` : null
    : null
  const statusTone = getStatusTone(booking.status)
  const statusMessage = getStatusMessage(booking.status, rejectionReason, cancellationReason)
  const tripReconciliationAmount = Number(booking.actual_toll_amount || 0) + Number(booking.actual_fuel_amount || 0)
  const totalIncludesTripReconciliation = booking.status === 'completed' && booking.rental_model === 'all_in' && tripReconciliationAmount > 0 && status_events.some((event) => event.note?.startsWith('Trip reconciled.'))
  const pricingBooking = totalIncludesTripReconciliation ? { ...booking, total_amount: booking.total_amount - tripReconciliationAmount } : booking
  const balanceSummary = getBookingAdjustmentSummary(pricingBooking, status_events, extensions)
  const displayedTotal = balanceSummary?.currentTotal ?? pricingBooking.total_amount
  const depositAmount = Number(booking.deposit_amount || 0)
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const paymentMadeAmount = Math.max(paymentTotal - depositAmount, 0)
  const displayedRemainingBalance = Math.max(displayedTotal + tripReconciliationAmount - depositAmount - paymentMadeAmount, 0)
  const customerNote = getDisplayBookingNote(booking.notes)
  const priceApprovalDeadline = new Date(new Date(booking.start_at).getTime() - 2 * 60 * 60 * 1000)
  const bookingSummary = [vehicle?.name || 'Vehicle pending', formatDateRange(booking.start_at, booking.end_at)]
    .filter(Boolean)
    .join('  ·  ')

  const doUpload = async (file: File, requestedTypeId: string, oldUpload?: { file_path: string; original_filename: string; mime_type: string; size_bytes: number } | null) => {
    if (!user) return
    setSizeError(null)
    setUploadingTypeId(requestedTypeId)

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/requested/${booking.id}/${Date.now()}.${ext}`

      const docId = await saveBookingRequestedDocument({
        booking_id: booking.id,
        customer_id: user.id,
        requested_type_id: requestedTypeId,
        file_path: path,
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      })

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        if (oldUpload) {
          await saveBookingRequestedDocument({
            booking_id: booking.id,
            customer_id: user.id,
            requested_type_id: requestedTypeId,
            file_path: oldUpload.file_path,
            original_filename: oldUpload.original_filename,
            mime_type: oldUpload.mime_type,
            size_bytes: oldUpload.size_bytes,
          })
        } else {
          await supabase.from('booking_requested_documents').delete().eq('id', docId)
        }
        throw uploadError
      }

      if (oldUpload) {
        const { error: removeError } = await supabase.storage.from('customer-documents').remove([oldUpload.file_path])
        if (removeError) console.warn('Failed to remove old requested-document file:', oldUpload.file_path, removeError)
      }

      toast.success('Document uploaded.')
      refetchBooking()
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setUploadingTypeId(null)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteBookingRequestedDocument(docId)
      toast.success('Document removed.')
      refetchBooking()
    } catch (error) {
      toast.error(showError(error as Error))
    }
  }

  const handleViewDoc = async (doc: { id: string; file_path: string; mime_type: string | null }) => {
    await openFile({
      id: doc.id,
      path: doc.file_path,
      alt: 'Requested Document',
      resolveUrl: getCustomerDocumentSignedUrl,
      isPdf: doc.mime_type === 'application/pdf',
    })
  }

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, requestedTypeId: string) => {
    uploadHandledRef.current = true
    const file = e.target.files?.[0]
    if (docInputRef.current) docInputRef.current.value = ''
    if (!file) {
      setUploadingTypeId(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSizeError(requestedTypeId)
      setUploadingTypeId(null)
      return
    }
    doUpload(file, requestedTypeId, oldUploadRef.current)
  }

  const handleDrop = (e: React.DragEvent, requestedTypeId: string) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setSizeError(requestedTypeId)
      return
    }
    doUpload(file, requestedTypeId, null)
  }

  const handleAcceptAdjustment = async () => {
    setAdjustmentAction('accept')

    try {
      if (Date.now() > priceApprovalDeadline.getTime()) {
        await cancelBooking.mutateAsync({ id: booking.id, reason: 'Price adjustment approval deadline passed.' })
        toast.success('Booking canceled because the approval deadline passed.')
        return
      }

      await acceptPriceAdjustment.mutateAsync({ id: booking.id })
      toast.success('Price adjustment accepted.')
    } catch (error) {
      toast.error(showError(error as Error))
    } finally {
      setAdjustmentAction(null)
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4f7fb] px-4 py-6 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[1440px]">
        <button onClick={() => navigate('/bookings')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#071f52]/60 transition-colors hover:text-[#071f52]">
          <ArrowLeft size={16} /> Back to bookings
        </button>

        <section className="rounded-[30px] border border-[#071f52]/8 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(7,31,82,0.08)] sm:px-7 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.65rem] font-black tracking-[-0.04em] text-[#3c42f6] sm:text-[1.9rem]">{booking.booking_number}</h1>
                <Badge className={`${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-500'} rounded-full px-4 py-1.5 text-xs font-bold`}>
                  {formatBookingStatus(booking.status)}
                </Badge>
              </div>

              <p className="mt-3 max-w-[900px] text-sm font-medium leading-7 text-[#071f52]/64 sm:text-[1rem]">
                {bookingSummary}
                <span className="ml-2 inline-block font-black text-[#071f52] tabular-nums">{formatCurrency(displayedTotal)}</span>
              </p>
            </div>

            <div className="min-w-[220px] text-left sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#071f52]/34">Created</p>
              <p className="mt-1 text-sm font-semibold text-[#071f52]/58">{formatDateTime(booking.created_at)}</p>
            </div>
          </div>

          <div className="mt-7 border-t border-[#071f52]/8 pt-8">
            <div className="relative">
              <div className="absolute left-5 right-5 top-4 hidden h-px bg-[#071f52]/10 sm:block" />
              <ol className="grid gap-6 sm:grid-cols-5 sm:gap-3">
                {TIMELINE_STATUSES.map((status, index) => {
                  const reached = timelineIdx >= index
                  const current = booking.status === status

                  return (
                    <li key={status} className="relative flex items-center gap-3 sm:flex-col sm:items-center sm:text-center">
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        current
                          ? 'border-[#4f46e5]/20 bg-[#4f46e5]/10 shadow-[0_0_0_7px_rgba(79,70,229,0.08)]'
                          : reached
                            ? 'border-[#071f52]/12 bg-[#071f52]'
                            : 'border-[#071f52]/10 bg-[#e9edf5]'
                      }`}>
                        {current ? <div className="h-3 w-3 rounded-full bg-[#4f46e5]" /> : <Circle className={`h-3.5 w-3.5 ${reached ? 'fill-white text-white' : 'fill-[#cfd6e2] text-[#cfd6e2]'}`} />}
                      </div>

                      <div>
                        <p className={`text-[11px] font-bold ${current ? 'text-[#4f46e5]' : reached ? 'text-[#071f52]' : 'text-[#071f52]/38'}`}>
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

        {booking.status === 'completed' && !hasSubmittedFeedback ? (
          <div className="mt-6 rounded-[26px] border border-[#071f52]/8 bg-white px-6 py-6 shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
            <h2 className="flex items-center gap-2 text-base font-black text-[#071f52]">
              <Star size={16} /> Leave a Review
            </h2>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className={`transition-colors ${star <= rating ? 'text-[#ffd923]' : 'text-[#071f52]/20'}`}>
                  <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your experience with this trip..."
              className="mt-3 block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              rows={3}
            />
            <Button onClick={handleSubmitFeedback} disabled={!rating} className="mt-3 w-full gap-2 bg-[#071f52] text-white hover:bg-[#112458]" size="sm">
              <Send size={14} /> Submit Review
            </Button>
          </div>
        ) : null}

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-[#16a34a]/20 bg-[#16a34a]/8 p-5 text-center">
            <p className="text-sm font-bold text-[#16a34a]">{BOOKING_MESSAGES.success.review_submitted}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
              <div className="border-b border-[#071f52]/8 px-6 py-5">
                <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Booking Details</h2>
              </div>

              <div className="px-6 py-6">
                <div className={`mb-6 rounded-2xl border px-4 py-4 ${statusTone.wrapper}`}>
                  <div className="flex items-start gap-3">
                    {booking.status !== 'rejected' && booking.status !== 'canceled' ? (
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${statusTone.icon}`} />
                    ) : null}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#071f52]/46">{statusMessage.title}</p>
                      <p className={`mt-1 text-sm font-medium leading-6 ${statusTone.text}`}>{statusMessage.body}</p>
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
                <div className="space-y-3">
                  {(booking.price_line_items || []).map((item, index) => (
                    <div key={index} className="flex items-start justify-between gap-4 border-b border-[#071f52]/6 pb-3 text-sm last:border-0 last:pb-0">
                      <span className="text-[#071f52]/64">{item.label}{item.detail ? ` (${item.detail})` : ''}</span>
                      <span className="font-bold text-[#071f52] tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 rounded-[22px] bg-[#f7f9fc] px-5 py-5">
                  <SummaryRow label="Total" value={formatCurrency(displayedTotal)} strong valueClassName="text-[#4f46e5]" />
                  {booking.rental_model === 'all_in' && booking.status !== 'completed' ? <SummaryRow label="Fuel Estimate" value={formatCurrency(Number(booking.fuel_estimate_amount || 0))} note="estimate only - settled after trip" /> : null}
                  {booking.rental_model === 'all_in' && booking.status !== 'completed' ? <SummaryRow label="Toll Estimate" value={formatCurrency(Number(booking.toll_estimate_amount || 0))} note="estimate only - settled after trip" /> : null}
                  {booking.status === 'completed' && booking.rental_model === 'all_in' ? <SummaryRow label="Trip Reconciliation" value={`${tripReconciliationAmount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(tripReconciliationAmount))}`} valueClassName={tripReconciliationAmount >= 0 ? 'text-[#f97316]' : 'text-[#16a34a]'} note={`Toll ${formatCurrency(Number(booking.actual_toll_amount || 0))} · Gas ${formatCurrency(Number(booking.actual_fuel_amount || 0))}`} /> : null}
                  {Math.abs(balanceSummary?.adjustmentAmount || 0) > 0.009 ? <SummaryRow label="Price Adjustment" value={`${balanceSummary?.isIncrease ? '+' : '-'}${formatCurrency(Math.abs(balanceSummary?.adjustmentAmount || 0))}`} valueClassName={balanceSummary?.isIncrease ? 'text-[#f97316]' : 'text-[#16a34a]'} /> : null}
                  {balanceSummary && balanceSummary.extensionAmount > 0 ? <SummaryRow label={getExtensionChargeLabel(balanceSummary.extensionDays)} value={`+${formatCurrency(balanceSummary.extensionAmount)}`} valueClassName="text-[#f97316]" /> : null}
                  <SummaryRow label="Security Deposit" value={`-${formatCurrency(depositAmount)}`} valueClassName="text-[#16a34a]" note="non-refundable" />
                  {paymentMadeAmount > 0 ? <SummaryRow label="Payment Made" value={`-${formatCurrency(paymentMadeAmount)}`} valueClassName="text-[#16a34a]" /> : null}
                  <SummaryRow label="Remaining Balance" value={formatCurrency(displayedRemainingBalance)} strong valueClassName="text-[#f97316]" />
                </div>
              </div>
            </section>

            <section id="payments-section" className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
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
                              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${payment.status === 'verified' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#eef2ff] text-[#4f46e5]'}`}>
                                {payment.status}
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-medium text-[#071f52]/62">
                              via {toLabel(payment.channel)}{payment.reference_number ? ` · ${payment.reference_number}` : ''}
                            </p>
                            <p className="mt-1 text-xs font-medium text-[#071f52]/40">{formatDateTime(payment.paid_at || payment.created_at)}</p>

                            {payment.receipt_path ? (
                              <a href="#" onClick={(event) => { event.preventDefault(); handleViewReceipt(payment.id, payment.receipt_path!) }} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4]">
                                <FileText className="h-4 w-4" /> {openingId === payment.id ? 'Opening...' : 'View receipt'}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-[#071f52]/8 pt-4 text-sm font-semibold text-[#071f52]/62">
                      <span>Recorded Payments</span>
                      <span className="font-black text-[#1f2a44] tabular-nums">{formatCurrency(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyNote>No payments recorded.</EmptyNote>
                )}
              </div>
            </section>

          </div>

          <aside className="space-y-6">
            {booking.status === 'pending_price_approval' && balanceSummary ? (
              <section className="rounded-[26px] border border-[#f2c96a] bg-[#fff9eb] shadow-[0_16px_40px_rgba(204,152,34,0.12)]">
                <div className="px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c76a00]">Pending price approval</p>
                  <div className="mt-4 space-y-2 border-b border-[#f2c96a]/70 pb-4">
                    <SummaryRow label="Old Remaining Balance" value={formatCurrency(balanceSummary.previousRemainingBalance)} />
                    {Math.abs(balanceSummary.adjustmentAmount) > 0.009 ? <SummaryRow label="Price Adjustment" value={`${balanceSummary.isIncrease ? '+' : '-'}${formatCurrency(Math.abs(balanceSummary.adjustmentAmount))}`} valueClassName={balanceSummary.isIncrease ? 'text-[#f97316]' : 'text-[#16a34a]'} /> : null}
                    {balanceSummary.extensionAmount > 0 ? <SummaryRow label={getExtensionChargeLabel(balanceSummary.extensionDays)} value={`+${formatCurrency(balanceSummary.extensionAmount)}`} valueClassName="text-[#f97316]" /> : null}
                    <SummaryRow label="New Remaining Balance" value={formatCurrency(balanceSummary.newRemainingBalance)} strong valueClassName="text-[#ea580c]" />
                  </div>

                  {balanceSummary.reason ? <p className="mt-3 text-sm font-medium text-[#7c5b2b]"><span className="font-bold text-[#5b3b10]">Reason:</span> {balanceSummary.reason}</p> : null}
                  <p className="mt-3 text-sm font-medium leading-6 text-[#6f5a32]">Respond by {formatDateTime(priceApprovalDeadline.toISOString())} — if you don't confirm, the booking is canceled and we won't charge the new price without your approval.</p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={handleAcceptAdjustment} disabled={adjustmentAction !== null || acceptPriceAdjustment.isPending || cancelBooking.isPending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#16a34a] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(22,163,74,0.18)] transition hover:bg-[#15803d] disabled:opacity-50">
                      {adjustmentAction === 'accept' ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                      {adjustmentAction === 'accept' ? 'Accepting...' : 'Accept Adjustment'}
                    </button>
                    <button type="button" onClick={handleCancelBooking} disabled={adjustmentAction !== null || acceptPriceAdjustment.isPending || cancelBooking.isPending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#f0a1a8] bg-white px-4 py-3 text-sm font-bold text-[#e11d48] transition hover:bg-[#fff1f2] disabled:opacity-50">
                      {adjustmentAction === 'cancel' ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current" /> : null}
                      {adjustmentAction === 'cancel' ? 'Canceling...' : 'Decline & Cancel'}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {requested_document_types.length > 0 ? (() => {
              const canEditDocs = booking.status === 'awaiting_documents'
              const visibleTypes = canEditDocs ? requested_document_types : requested_document_types

              if (visibleTypes.length === 0) return null

              return (
                <section className={`rounded-[26px] border shadow-[0_16px_40px_rgba(79,70,229,0.1)] ${canEditDocs ? 'border-[#c7d2fe] bg-[#eef2ff]' : 'border-[#071f52]/8 bg-white'}`}>
                  <div className="px-6 py-5">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${canEditDocs ? 'text-[#4f46e5]' : 'text-[#071f52]/48'}`}>Requested documents</p>
                    {adminRequestSentAt ? (
                      <p className="mt-2 text-xs font-semibold text-[#4f46e5]/60">Request sent {formatDateTime(adminRequestSentAt)}</p>
                    ) : null}

                    <input
                      ref={docInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => uploadingTypeId ? handleDocUpload(e, uploadingTypeId) : null}
                      className="hidden"
                      aria-label="Upload requested document"
                    />

                    <div className="mt-4 space-y-3">
                      {visibleTypes.map((type) => (
                        <div key={type.id} className={`rounded-xl border bg-white px-4 py-3 ${canEditDocs ? 'border-[#c7d2fe]/50' : 'border-[#071f52]/8'}`}>
                          <p className="text-sm font-bold text-[#1f2a44]">{type.label}</p>

                          {type.upload ? (
                            <>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  {uploadingTypeId === type.id ? (
                                    <div className="flex items-center gap-2">
                                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#4f46e5]/30 border-t-[#4f46e5]" />
                                      <span className="text-xs font-semibold text-[#4f46e5]">Uploading...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="truncate text-xs font-semibold text-[#16a34a]">{type.upload.original_filename || type.upload.file_path}</p>
                                      <p className="text-[10px] font-medium text-[#16a34a]/70">Uploaded</p>
                                    </>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleViewDoc({ id: type.upload!.id, file_path: type.upload!.file_path, mime_type: type.upload!.mime_type })}
                                    disabled={openingId === type.upload.id || uploadingTypeId !== null}
                                    className="rounded-lg px-2 py-1 text-xs font-bold text-[#4f46e5] underline hover:text-[#3639d4] disabled:opacity-50"
                                  >
                                    {openingId === type.upload.id ? 'Opening...' : 'View'}
                                  </button>
                                  {canEditDocs ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => { if (!uploadingTypeId && type.upload) { uploadHandledRef.current = false; oldUploadRef.current = { file_path: type.upload.file_path, original_filename: type.upload.original_filename || '', mime_type: type.upload.mime_type || '', size_bytes: type.upload.size_bytes ?? 0 }; setUploadingTypeId(type.id); docInputRef.current?.click() } }}
                                        disabled={uploadingTypeId !== null}
                                        className="rounded-lg px-2 py-1 text-xs font-bold text-[#4f46e5] underline hover:text-[#3639d4] disabled:opacity-50"
                                      >
                                        Replace
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDoc(type.upload!.id)}
                                        disabled={uploadingTypeId !== null}
                                        className="rounded-lg p-1 text-[#071f52]/30 transition-colors hover:bg-[#e92935]/8 hover:text-[#e92935] disabled:opacity-20"
                                        aria-label={`Delete ${type.label}`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              {sizeError === type.id ? (
                                <p className="mt-1 text-[10px] font-semibold text-[#e92935]">File must be under 5 MB.</p>
                              ) : null}
                            </>
                          ) : canEditDocs ? (
                            <>
                              <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => handleDrop(e, type.id)}
                                onClick={() => { if (!uploadingTypeId) { uploadHandledRef.current = false; setSizeError(null); oldUploadRef.current = null; setUploadingTypeId(type.id); docInputRef.current?.click() } }}
                                className={`mt-2 cursor-pointer rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors ${
                                  dragOver
                                    ? 'border-[#4f46e5] bg-[#4f46e5]/8'
                                    : 'border-[#4f46e5]/25 bg-[#f8f9ff] hover:border-[#4f46e5]/40'
                                } ${uploadingTypeId !== null ? 'pointer-events-none opacity-50' : ''}`}
                              >
                                {uploadingTypeId === type.id ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4f46e5]/30 border-t-[#4f46e5]" />
                                    <span className="text-xs font-semibold text-[#4f46e5]">Uploading...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <Upload size={14} className="text-[#4f46e5]" />
                                    <span className="text-xs font-semibold text-[#4f46e5]">Upload file</span>
                                  </div>
                                )}
                              </div>
                              {sizeError === type.id ? (
                                <p className="mt-1 text-[10px] font-semibold text-[#e92935]">File must be under 5 MB.</p>
                              ) : (
                                <p className="mt-1 text-[10px] text-[#4f46e5]/50">Max 5 MB per file</p>
                              )}
                            </>
                          ) : (
                            <p className="mt-2 text-xs font-medium text-[#071f52]/42">No uploaded document</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )
            })() : null}

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
                        {event.note ? <p className="mt-1 text-sm font-medium leading-6 text-[#071f52]/62">{event.to_status === 'canceled' ? formatCancellationReason(event.note) : event.note}</p> : null}
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

            {invoice ? (
              <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
                <div className="border-b border-[#071f52]/8 px-6 py-5">
                  <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Invoice</h2>
                </div>

                <div className="px-6 py-6">
                  <SummaryRow label="Invoice #" value={invoice.invoice_number} />
                  <SummaryRow label="Amount" value={formatCurrency(invoice.total_amount)} />
                  <SummaryRow label="Status" value={toLabel(invoice.status)} />

                  <Button variant="outline" className="mt-4 w-full gap-2 text-sm" onClick={handleDownloadInvoice} disabled={isDownloadingInvoice}>
                    <FileText size={14} /> {isDownloadingInvoice ? 'Preparing...' : 'Download Invoice'}
                  </Button>
                </div>
              </section>
            ) : null}

            {canCustomerCancelBooking(booking.status) && booking.status !== 'pending_price_approval' ? (
              <Button
                variant="outline"
                className="w-full gap-2 rounded-2xl border-[#e92935]/30 py-6 text-sm text-[#e92935] hover:bg-[#e92935]/8"
                onClick={handleCancelBooking}
                disabled={cancelBooking.isPending}
              >
                Cancel Booking
              </Button>
            ) : null}
          </aside>
        </div>

        <ImageViewer open={!!viewing} onClose={closeViewer} src={viewing?.src || ''} alt={viewing?.alt || ''} />
      </div>
    </main>
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

function SummaryRow({
  label,
  value,
  strong = false,
  note,
  valueClassName = '',
}: {
  label: string
  value: string
  strong?: boolean
  note?: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className={`text-sm ${strong ? 'font-black text-[#1f2a44]' : 'font-medium text-[#071f52]/62'}`}>{label}</p>
        {note ? <p className="mt-1 text-xs font-medium text-[#071f52]/38">{note}</p> : null}
      </div>
      <p className={`text-right tabular-nums ${strong ? 'text-base font-black text-[#1f2a44]' : 'text-sm font-bold text-[#1f2a44]'} ${valueClassName}`}>{value}</p>
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
  const start = new Date(startAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })
  const end = endAt ? new Date(endAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  return `${start} – ${end}`
}

function getExtensionChargeLabel(days: number) {
  return days > 0 ? `Extension Charge (${days} day${days === 1 ? '' : 's'})` : 'Extension Charge'
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
      case 'admin_refund':
        return 'Canceled by admin with a refund'
      case 'admin_no_refund':
        return 'Canceled by admin without a refund'
      default:
        return `Canceled: ${toLabel(type)}`
    }
  })()

  return reason ? `${label}. Reason: ${reason}` : label
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
        body: 'Your booking is under review. We are checking the trip details and payment before confirming it.',
      }
    case 'awaiting_documents':
      return {
        title: 'Awaiting documents',
        body: 'Your booking is paused until the missing documents are uploaded and reviewed.',
      }
    case 'confirmed':
      return {
        title: 'Booking confirmed',
        body: 'Your booking is confirmed and ready for the next trip steps.',
      }
    case 'pending_price_approval':
      return {
        title: 'Pending price approval',
        body: 'We updated the trip price. Review the new remaining balance before this booking can be confirmed.',
      }
    case 'on_trip':
      return {
        title: 'Trip in progress',
        body: 'This booking is currently active. Any updates will appear in the status history below.',
      }
    case 'completed':
      return {
        title: 'Trip completed',
        body: 'This booking has been completed. You can review the payment trail and download your invoice anytime.',
      }
    case 'rejected':
      return {
        title: 'Booking rejected',
        body: rejectionReason || 'This booking was rejected. Contact support if you need more details.',
      }
    case 'canceled':
      return {
        title: 'Booking canceled',
        body: formatCancellationReason(cancellationReason),
      }
    default:
      return {
        title: 'Booking update',
        body: 'Your booking has been updated.',
      }
  }
}
