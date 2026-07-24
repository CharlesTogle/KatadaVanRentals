import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAdminBooking, useAdminBookingAction } from '@/hooks/use-bookings'
import { formatBookingStatus, getAdminBookingDetailActions, type AdminActionType } from '@/lib/booking-utils'
import { STATUS_COLORS } from '@/config/constants'
import { cn } from '@/lib/utils'
import { showError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { Dialog } from '@/components/ui/dialog'
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

export default function BookingDetail() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>()
  const { data, isLoading, error } = useAdminBooking(bookingNumber)
  const bookingAction = useAdminBookingAction()
  const [activeModal, setActiveModal] = useState<AdminActionType | null>(null)
  const [modalForm, setModalForm] = useState({ reason: '', amount: '', newDate: '', docs: '' })
  const bookingStatus = data?.booking.status
  const timelineIdx = useMemo(() => bookingStatus ? TIMELINE_STATUSES.indexOf(bookingStatus) : -1, [bookingStatus])
  const actions = useMemo(() => bookingStatus ? getAdminBookingDetailActions(bookingStatus) : [], [bookingStatus])
  const primaryActions = useMemo(() => actions.filter((action) => action.variant !== 'danger'), [actions])
  const destructiveActions = useMemo(() => actions.filter((action) => action.variant === 'danger'), [actions])

  useEffect(() => {
    if (activeModal) return

    setModalForm({ reason: '', amount: '', newDate: '', docs: '' })
  }, [activeModal])

  if (isLoading) {
    return (
      <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
      <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Link to="/admin/bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#071f52]/60 hover:text-[#071f52] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-12 text-center">
          <p className="text-sm font-bold text-[#071f52]/48">Booking not found.</p>
        </div>
      </div>
    )
  }

  const { booking, customer, vehicle, payments, documents, status_events, extensions, invoice } = data
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
  const statusTone = getStatusTone(booking.status)
  const statusMessage = getStatusMessage(booking.status)
  const bookingSummary = [vehicle?.name || 'Vehicle pending', customerName, formatDateRange(booking.start_at, booking.end_at)]
    .filter(Boolean)
    .join('  ·  ')

  const handleConfirmBooking = async () => {
    try {
      await bookingAction.mutateAsync({ type: 'confirm', bookingId: booking.id })
      setActiveModal(null)
      toast.success('Booking confirmed.')
    } catch (actionError) {
      toast.error(showError(actionError as Error))
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4f7fb] px-4 py-6 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
                <span className="ml-2 inline-block font-black text-[#071f52] tabular-nums">{formatCurrency(booking.total_amount)}</span>
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
                    <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', statusTone.icon)} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#071f52]/46">{statusMessage.title}</p>
                      <p className={cn('mt-1 text-sm font-medium leading-6', statusTone.text)}>{statusMessage.body}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                  <Spec label="Vehicle" value={vehicle?.name || '—'} />
                  <Spec label="Rental Type" value={toLabel(booking.rental_model)} />
                  <Spec label="Duration" value={`${booking.duration_days} day${booking.duration_days === 1 ? '' : 's'}`} />
                  <Spec label="Start Date" value={formatDateTime(booking.start_at)} />
                  <Spec label="End Date" value={booking.end_at ? formatDateTime(booking.end_at) : '—'} />
                  <Spec label="Pickup Location" value={booking.pickup_location || '—'} />
                  <Spec label="Dropoff Location" value={booking.dropoff_location || '—'} />
                  <Spec label="Destination" value={booking.destination || booking.dropoff_location || '—'} />
                  <Spec label="Purpose of Travel" value={booking.purpose_of_travel || 'Not specified'} />
                </div>

                {booking.notes ? (
                  <div className="mt-6 rounded-2xl bg-[#f7f9fc] px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#071f52]/42">Customer Note</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#071f52]/70">{booking.notes}</p>
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
                  {booking.price_line_items?.map((item, index) => (
                    <div key={index} className="flex items-start justify-between gap-4 border-b border-[#071f52]/6 pb-3 text-sm last:border-0 last:pb-0">
                      <span className="text-[#071f52]/64">{item.label}{item.detail ? ` (${item.detail})` : ''}</span>
                      <span className="font-bold text-[#071f52] tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 rounded-[22px] bg-[#f7f9fc] px-5 py-5">
                  <SummaryRow label="Total" value={formatCurrency(booking.total_amount)} strong valueClassName="text-[#4f46e5]" />
                  <SummaryRow label="Security Deposit" value={`-${formatCurrency(booking.deposit_amount)}`} valueClassName="text-[#16a34a]" note="non-refundable" />
                  <SummaryRow label="Remaining Balance" value={formatCurrency(booking.remaining_amount)} strong valueClassName="text-[#f97316]" />
                </div>
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
                              <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', payment.status === 'verified' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#eef2ff] text-[#4f46e5]')}>
                                {payment.status}
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-medium text-[#071f52]/62">
                              via {toLabel(payment.channel)}{payment.reference_number ? ` · ${payment.reference_number}` : ''}
                            </p>
                            <p className="mt-1 text-xs font-medium text-[#071f52]/40">{formatDateTime(payment.paid_at || payment.created_at)}</p>

                            {payment.receipt_path ? (
                              <a href={payment.receipt_path} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4]">
                                <FileText className="h-4 w-4" /> View receipt
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
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#eef2f8] px-2 text-xs font-bold text-[#071f52]/48">{documents.length}</span>
              </div>

              <div className="px-6 py-6">
                {documents.length ? (
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

                        <a href={document.file_path} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4]">
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyNote>No documents on file.</EmptyNote>
                )}
              </div>
            </section>

            {actions.length > 0 ? (
              <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)] xl:sticky xl:top-6">
                <div className="border-b border-[#071f52]/8 px-6 py-5">
                  <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Actions</h2>
                </div>

                <div className="px-6 py-6">
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

            {invoice ? (
              <section className="rounded-[26px] border border-[#071f52]/8 bg-white shadow-[0_16px_40px_rgba(7,31,82,0.06)]">
                <div className="border-b border-[#071f52]/8 px-6 py-5">
                  <h2 className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1f2a44]">Invoice</h2>
                </div>

                <div className="px-6 py-6">
                  <SummaryRow label="Invoice #" value={invoice.invoice_number} />
                  <SummaryRow label="Amount" value={formatCurrency(invoice.total_amount)} />
                  <SummaryRow label="Status" value={toLabel(invoice.status)} />

                  {invoice.file_path ? (
                    <a href={invoice.file_path} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#4f46e5] transition-colors hover:text-[#3639d4]">
                      <FileText className="h-4 w-4" /> Download Invoice
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}
          </aside>
        </div>

      {/* Modals */}
      <ConfirmModal open={activeModal === 'confirm'} onClose={() => setActiveModal(null)} onConfirm={handleConfirmBooking} isPending={bookingAction.isPending} />
      <RejectModal open={activeModal === 'reject'} onClose={() => setActiveModal(null)} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} />
      <AdjustBookingModal open={activeModal === 'adjust_booking'} onClose={() => setActiveModal(null)} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} />
      <RequestDocsModal open={activeModal === 'request_documents'} onClose={() => setActiveModal(null)} docs={modalForm.docs} setDocs={(docs) => setModalForm((current) => ({ ...current, docs }))} />
      <StartTripModal open={activeModal === 'start_trip'} onClose={() => setActiveModal(null)} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} />
      <ExtendRentalModal open={activeModal === 'extend_rental'} onClose={() => setActiveModal(null)} newDate={modalForm.newDate} setNewDate={(newDate) => setModalForm((current) => ({ ...current, newDate }))} amount={modalForm.amount} setAmount={(amount) => setModalForm((current) => ({ ...current, amount }))} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} />
      <CompleteModal open={activeModal === 'complete'} onClose={() => setActiveModal(null)} />
      <CancelModal open={activeModal === 'cancel'} onClose={() => setActiveModal(null)} reason={modalForm.reason} setReason={(reason) => setModalForm((current) => ({ ...current, reason }))} />
      <DeleteModal open={activeModal === 'delete'} onClose={() => setActiveModal(null)} />
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

function RejectModal({ open, onClose, reason, setReason }: { open: boolean; onClose: () => void; reason: string; setReason: (v: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Reject Booking">
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reason (required)</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Tell the customer why the booking is being rejected" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#e92935] text-white hover:bg-[#e92935]/90" disabled={!reason.trim()}>Reject</button>
      </div>
    </Dialog>
  )
}

function AdjustBookingModal({ open, onClose, reason, setReason, amount, setAmount }: { open: boolean; onClose: () => void; reason: string; setReason: (v: string) => void; amount: string; setAmount: (v: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Adjust Booking Price">
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">New Total Amount</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the adjusted total price" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reason (required)</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain why the price was adjusted" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90" disabled={!reason.trim() || !amount}>Save</button>
      </div>
    </Dialog>
  )
}

function RequestDocsModal({ open, onClose, docs, setDocs }: { open: boolean; onClose: () => void; docs: string; setDocs: (v: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Request Documents">
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Documents to request</label>
      <textarea value={docs} onChange={(e) => setDocs(e.target.value)} rows={3} placeholder="e.g. Valid ID, Proof of billing" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90" disabled={!docs.trim()}>Send Request</button>
      </div>
    </Dialog>
  )
}

function StartTripModal({ open, onClose, amount, setAmount }: { open: boolean; onClose: () => void; amount: string; setAmount: (v: string) => void }) {
  const [method, setMethod] = useState('cash')
  const [ref, setRef] = useState('')
  return (
    <Dialog open={open} onClose={onClose} title="Release Unit / Start Trip">
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Remaining Balance Collected</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the amount collected" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Payment Method</label>
      <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none">
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="ewallet">E-Wallet</option>
      </select>
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reference Number (optional)</label>
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference number or official receipt" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90">Start Trip</button>
      </div>
    </Dialog>
  )
}

function ExtendRentalModal({ open, onClose, newDate, setNewDate, amount, setAmount, reason, setReason }: { open: boolean; onClose: () => void; newDate: string; setNewDate: (v: string) => void; amount: string; setAmount: (v: string) => void; reason: string; setReason: (v: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Extend Rental">
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">New Return Date</label>
      <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} placeholder="Select the new return date" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Extension Charge</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter the extension charge" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm mb-3 focus:border-[#071f52] focus:outline-none" />
      <label className="block text-xs font-bold text-[#071f52]/48 mb-1">Reason (optional)</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional note for the extension" className="w-full rounded-xl border border-[#071f52]/14 px-3 py-2 text-sm focus:border-[#071f52] focus:outline-none" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#071f52] text-white hover:bg-[#071f52]/90" disabled={!newDate}>Extend</button>
      </div>
    </Dialog>
  )
}

function CompleteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Mark as Returned">
      <p className="text-sm text-[#071f52]/70">Mark this booking as completed? The vehicle will be available for new bookings.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#16a34a] text-white hover:bg-[#16a34a]/90">Complete</button>
      </div>
    </Dialog>
  )
}

function CancelModal({ open, onClose, reason, setReason }: { open: boolean; onClose: () => void; reason: string; setReason: (v: string) => void }) {
  const [cancelType, setCancelType] = useState('customer_request')

  const options = [
    { value: 'admin_refund', label: 'Admin - refund deposit to customer' },
    { value: 'admin_no_refund', label: 'Admin - no refund' },
    { value: 'customer_request', label: 'Customer requested - no refund' },
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
        <button onClick={onClose} className="flex-1 rounded-2xl border border-[#d7ddea] px-4 py-3 text-sm font-bold text-[#4d5a72] transition-colors hover:bg-[#f7f9fc]">Back</button>
        <button onClick={onClose} className="flex-1 rounded-2xl bg-[#ef1111] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d90f0f] disabled:opacity-50" disabled={!reason.trim()}>Confirm Cancel</button>
      </div>
    </Dialog>
  )
}


function DeleteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Delete Booking">
      <p className="text-sm text-[#e92935] font-bold">Warning: This will permanently delete this booking. This action cannot be undone.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold border border-[#071f52]/12 hover:bg-[#071f52]/6">Cancel</button>
        <button onClick={onClose} className="rounded-full px-4 py-2 text-xs font-bold bg-[#e92935] text-white hover:bg-[#e92935]/90">Delete Forever</button>
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
  return `₱${Number(value || 0).toLocaleString()}.00`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', {
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

function toLabel(value: string) {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

function getStatusMessage(status: string) {
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
        body: 'This request was rejected and should remain available only for history and customer follow-up.',
      }
    case 'canceled':
      return {
        title: 'Booking canceled',
        body: 'This booking was canceled. Review the cancellation note and any recorded payments before removing it.',
      }
    default:
      return {
        title: 'Booking status',
        body: 'Review the booking information below and use the available actions when you are ready.',
      }
  }
}
