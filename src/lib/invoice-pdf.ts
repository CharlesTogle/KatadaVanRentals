import { getBookingInvoiceData, type BookingInvoiceData } from '@/services/booking-service'

const BUSINESS_NAME = 'Katada Transportation Services'

export async function downloadBookingInvoicePdf(bookingId: string) {
  const invoice = await getBookingInvoiceData(bookingId)
  const element = document.createElement('div')
  element.innerHTML = buildInvoiceHtml(invoice)
  element.style.position = 'fixed'
  element.style.top = '0'
  element.style.left = '0'
  element.style.pointerEvents = 'none'
  element.style.zIndex = '-1'
  document.body.append(element)
  const page = element.querySelector('.invoice-page')

  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        filename: `${buildInvoiceNumber(invoice.booking.booking_number)}.pdf`,
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      })
      .from(page instanceof HTMLElement ? page : element)
      .save()
  } finally {
    element.remove()
  }
}

export async function buildInvoicePdf(data: BookingInvoiceData) {
  const element = document.createElement('div')
  element.innerHTML = buildInvoiceHtml(data)
  const html2pdf = (await import('html2pdf.js')).default

  return html2pdf()
    .set({ margin: 0, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } })
    .from(element)
    .outputPdf('blob') as Promise<Blob>
}

export function buildInvoiceHtml(data: BookingInvoiceData) {
  const invoice = getInvoiceView(data)

  return `
    <style>
      @page { size: A4; margin: 0; }
      .invoice-page, .invoice-page * { box-sizing: border-box; border: 0 !important; outline: 0; box-shadow: none; }
      .invoice-page { width: 8.27in; min-height: 11.69in; padding: .6in .52in .5in; color: #16181d; background: #fff; font-family: Arial, Helvetica, sans-serif; }
      .invoice-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 28px; align-items: end; padding-bottom: 14px; border-bottom: 3px solid #1f242c !important; }
      .brand-block { display: grid; gap: 12px; }
      .brand-icon { display: block; width: 48px; height: 48px; object-fit: contain; }
      .brand { font-size: 17px; font-weight: 700; letter-spacing: .01em; }
      .small { font-size: 10px; line-height: 1.6; color: #7e8795; }
      .title { margin: 0 0 12px; font-size: 34px; line-height: 1; letter-spacing: .16em; text-align: right; font-weight: 800; }
      .meta { display: grid; gap: 8px; justify-items: end; font-size: 11px; color: #5a6472; }
      .meta strong { color: #26303d; }
      .section { padding: 18px 0; }
      .bill-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: start; border-bottom: 1px solid #d9dfe7 !important; }
      .label { margin-bottom: 10px; font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #9aa3b2; }
      .name { font-size: 15px; font-weight: 700; color: #1a1f28; }
      .notice-badge { padding: 6px 10px; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6c7685; border: 1px solid #d9dfe7 !important; border-radius: 2px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; border-bottom: 1px solid #d9dfe7 !important; }
      .detail { min-height: 76px; }
      .detail strong { display: block; margin-top: 6px; font-size: 12px; font-weight: 700; line-height: 1.45; color: #1a1f28; }
      .detail .subtle { display: block; margin-top: 6px; font-size: 10px; line-height: 1.5; color: #7e8795; }
      .split { display: grid; grid-template-columns: 1fr .96fr; gap: 22px; border-bottom: 3px solid #1f242c !important; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { padding: 8px 0 10px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #9aa3b2; }
      td { padding: 8px 0; vertical-align: top; line-height: 1.45; color: #2a313c; }
      th:last-child, td:last-child { text-align: right; }
      tbody tr + tr td { border-top: 1px solid #edf1f5 !important; }
      .table-title { margin-bottom: 8px; font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #9aa3b2; }
      .muted { color: #9aa3b2; font-style: italic; }
      .total { display: flex; justify-content: space-between; gap: 16px; padding-top: 12px; margin-top: 4px; font-size: 14px; font-weight: 700; color: #171b22; }
      .due-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: start; padding: 28px 0 16px; }
      .due-title { font-size: 16px; font-weight: 700; color: #171b22; }
      .due-copy { margin-top: 18px; font-size: 10px; line-height: 1.6; color: #6f7987; }
      .due-amount { font-size: 18px; font-weight: 700; color: #171b22; }
      .due-amount strong { font-size: 28px; color: #e12b27; letter-spacing: .02em; }
      .note { margin-top: 10px; padding-top: 18px; border-top: 1px solid #d9dfe7 !important; font-size: 10px; line-height: 2; color: #9aa3b2; }
      .note strong { color: #444d5b; }
      .footer { margin-top: 16px; font-size: 10px; line-height: 1.7; text-align: center; color: #b0b8c5; }
    </style>
    <main class="invoice-page">
      <header class="invoice-top">
        <div class="brand-block">
          <img class="brand-icon" src="/apple-touch-icon.png" alt="Katada Transportation Services">
          <div class="brand">${esc(BUSINESS_NAME)}</div>
          <div class="small">${esc(invoice.businessAddress)}<br>${esc(invoice.supportEmail)}</div>
        </div>
        <div>
          <h1 class="title">INVOICE</h1>
          <div class="meta">
            <span><strong>No:</strong> ${esc(invoice.invoiceNumber)}</span>
            <span><strong>Date:</strong> ${esc(invoice.issueDate)}</span>
            <span><strong>Booking:</strong> ${esc(data.booking.booking_number)}</span>
          </div>
        </div>
      </header>

      <section class="section bill-row">
        <div>
          <div class="label">Billed To</div>
          <div class="name">${esc(invoice.customerName)}</div>
          <div class="small">${esc(invoice.customerEmail)}<br>${esc(invoice.customerPhone)}</div>
        </div>
        <div class="notice-badge">Not an official receipt</div>
      </section>

      <section class="section summary-grid">
        <div class="detail">
          <div class="label">Vehicle</div>
          <strong>${esc(invoice.vehicleName)}</strong>
          <span class="subtle">${esc(invoice.vehicleMeta)}</span>
        </div>
        <div class="detail">
          <div class="label">Rental Period</div>
          <strong>${formatPeriodHtml(invoice.period)}</strong>
          <span class="subtle">${esc(invoice.duration)}</span>
        </div>
        <div class="detail">
          <div class="label">Type</div>
          <strong>${esc(invoice.rentalType)}</strong>
        </div>
        <div class="detail">
          <div class="label">Pick-Up · Drop-Off</div>
          <strong>${esc(invoice.pickupDropoff || '-')}</strong>
        </div>
      </section>

      <section class="section split">
        <div>
          <div class="table-title">Charges</div>
          <table>
            <thead><tr><th>Description</th><th>Amount</th></tr></thead>
            <tbody>${invoice.charges.map((charge) => `<tr><td>${esc(charge.label)}</td><td>${esc(formatCurrency(charge.amount))}</td></tr>`).join('')}</tbody>
          </table>
          <div class="total"><span>Rental Total</span><span>${esc(formatCurrency(data.booking.total_amount))}</span></div>
        </div>
        <div>
          <div class="table-title">Payments</div>
          <table>
            <thead><tr><th>Payment</th><th>Amount</th></tr></thead>
            <tbody>${invoice.paymentsHtml}</tbody>
          </table>
        </div>
      </section>

      <section class="due-row">
        <div>
          <div class="due-title">Amount Due</div>
          <div class="due-copy">Please settle the remaining balance on the day of vehicle pickup.</div>
        </div>
        <div class="due-amount"><strong>${esc(formatCurrency(invoice.dueAmount))}</strong></div>
      </section>

      <p class="note"><strong>Note:</strong> Additional charges may apply for excess usage, vehicle damage beyond normal wear, fuel shortfall, or non-compliance with rental terms. Any extra charges will be communicated and settled separately.</p>
      <p class="footer">This is an invoice, not an official receipt. For an official receipt please contact ${esc(BUSINESS_NAME)} directly. · ${esc(invoice.supportEmail)} · Generated ${esc(formatDateTime(data.booking.updated_at || data.booking.created_at))}</p>
    </main>
  `
}

export function buildInvoicePlaintext(data: BookingInvoiceData) {
  const invoice = getInvoiceView(data)

  return [
    BUSINESS_NAME,
    invoice.businessAddress,
    invoice.supportEmail,
    'I N V O I C E',
    `No: ${invoice.invoiceNumber}`,
    `Date: ${invoice.issueDate}`,
    `Booking: ${data.booking.booking_number}`,
    'B I L L E D T O',
    invoice.customerName,
    invoice.customerEmail,
    invoice.customerPhone,
    'NOT AN OFFICIAL RECEIPT',
    'V E H I C L E',
    invoice.vehicleName,
    invoice.vehicleMeta,
    'R E N T A L P E R I O D',
    invoice.period,
    invoice.duration,
    'T Y P E',
    invoice.rentalType,
    'P I C K - U P · D R O P - O F F',
    invoice.pickupDropoff || '-',
    'C H A R G E S',
    ...invoice.charges.map((charge) => `${charge.label} ${formatCurrency(charge.amount)}`),
    `Rental Total ${formatCurrency(data.booking.total_amount)}`,
    'P A Y M E N T S',
    data.payments.length ? data.payments.map((payment) => `${formatDate(payment.paid_at || payment.created_at)} · ${toPaymentLabel(payment.channel)} ${formatCurrency(payment.amount)}`).join('\n') : 'No payments recorded',
    `Amount Due ${formatCurrency(invoice.dueAmount)}`,
  ].join('\n')
}

function getInvoiceView(data: BookingInvoiceData) {
  const paymentsTotal = data.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const dueAmount = Number(data.booking.remaining_amount || Math.max(0, data.booking.total_amount - paymentsTotal))
  const vehicleMeta = data.vehicle?.year ? `Toyota · ${data.vehicle.year}` : 'Toyota'
  const pickupDropoff = [data.booking.pickup_location, data.booking.dropoff_location].filter(Boolean).join(' - ')
  const paymentsHtml = data.payments.length
    ? data.payments.slice(0, 5).map((payment) => `<tr><td>${esc(formatDate(payment.paid_at || payment.created_at))}<br><span class="muted">${esc(toPaymentLabel(payment.channel))}${payment.reference_number ? ` · Ref ${esc(payment.reference_number)}` : ''}</span></td><td>${esc(formatCurrency(payment.amount))}</td></tr>`).join('')
    : '<tr><td class="muted" colspan="2">No payments recorded</td></tr>'
  const customerName = [data.customer?.first_name, data.customer?.last_name].filter(Boolean).join(' ') || data.booking.guest_name || 'Guest customer'

  return {
    invoiceNumber: buildInvoiceNumber(data.booking.booking_number),
    issueDate: formatDate(data.booking.updated_at || data.booking.created_at),
    businessAddress: data.business.business_address || '11th 12th St., Villamor',
    supportEmail: data.business.support_email || 'tadsuu@gmail.com',
    customerName,
    customerEmail: data.customer?.email || data.booking.guest_email || '-',
    customerPhone: data.customer?.mobile || data.booking.guest_mobile || '-',
    vehicleName: data.vehicle?.name || 'Vehicle pending',
    vehicleMeta,
    period: `${formatDateTime(data.booking.start_at)} → ${formatDateTime(data.booking.end_at)}`,
    duration: formatDuration(data.booking.start_at, data.booking.end_at),
    rentalType: toRentalLabel(data.booking.rental_model),
    pickupDropoff,
    dueAmount,
    charges: normalizeCharges(data),
    paymentsHtml,
  }
}

function normalizeCharges(data: BookingInvoiceData) {
  const items = (data.booking.price_line_items || []).map((item) => ({
    label: item.detail ? `${item.label} (${item.detail})` : item.label,
    amount: Number(item.amount || 0),
  }))

  return items.slice(0, 8)
}

function buildInvoiceNumber(bookingNumber: string) {
  return `INV-${bookingNumber}`
}

function formatCurrency(amount: number) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(value))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Manila',
  }).format(new Date(value)).replace(/, (?=\d{2}:\d{2}$)/, ' ')
}

function formatDuration(startAt: string, endAt: string | null) {
  if (!endAt) return '-'
  const diffMs = Math.max(0, new Date(endAt).getTime() - new Date(startAt).getTime())
  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const parts = []

  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)

  return parts.join(' ') || '0 minutes'
}

function toRentalLabel(value: string) {
  if (value === 'self_drive') return 'Self-Drive'
  if (value === 'all_in') return 'All-In'
  if (value === 'all_out') return 'All-Out'
  return value
}

function toPaymentLabel(value: string) {
  if (value === 'bank_transfer') return 'Bank Transfer'
  if (value === 'ewallet') return 'E-Wallet'
  if (value === 'cash') return 'Cash'
  return value
}

function esc(value: string | number) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] || char)
}

function formatPeriodHtml(period: string) {
  const [start, end] = period.split(' → ')
  if (!end) return esc(period)
  return `${esc(start)} →<br>${esc(end)}`
}
