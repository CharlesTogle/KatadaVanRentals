import { getBookingInvoiceData, type BookingInvoiceData } from '@/services/booking-service'

const PAGE_WIDTH = 842
const PAGE_HEIGHT = 595
const BUSINESS_NAME = 'Katada Transportation Sevices'

type RgbColor = [number, number, number]

interface TextOptions {
  font?: 'F1' | 'F2' | 'F3'
  size?: number
  color?: RgbColor
  align?: 'left' | 'right' | 'center'
}

export async function downloadBookingInvoicePdf(bookingId: string) {
  const invoice = await getBookingInvoiceData(bookingId)
  const pdf = buildInvoicePdf(invoice)
  const url = URL.createObjectURL(pdf)
  const link = document.createElement('a')

  link.href = url
  link.download = `${buildInvoiceNumber(invoice.booking.booking_number)}.pdf`
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function buildInvoicePdf(data: BookingInvoiceData) {
  const content = buildInvoiceContent(data)
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>',
  ]

  return new Blob([buildPdfDocument(objects)], { type: 'application/pdf' })
}

export function buildInvoicePlaintext(data: BookingInvoiceData) {
  const invoiceNumber = buildInvoiceNumber(data.booking.booking_number)
  const issueDate = formatDate(data.booking.updated_at || data.booking.created_at)
  const customerName = [data.customer?.first_name, data.customer?.last_name].filter(Boolean).join(' ') || data.booking.guest_name || 'Guest customer'
  const customerEmail = data.customer?.email || data.booking.guest_email || '-'
  const customerPhone = data.customer?.mobile || data.booking.guest_mobile || '-'
  const vehicleMeta = data.vehicle?.year ? `Toyota · ${data.vehicle.year}` : 'Toyota'
  const charges = normalizeCharges(data)
  const dueAmount = Number(data.booking.remaining_amount || 0)

  return [
    BUSINESS_NAME,
    data.business.business_address || '11th 12th St., Villamor',
    data.business.support_email || 'tadsuu@gmail.com',
    'I N V O I C E',
    `No: ${invoiceNumber}`,
    `Date: ${issueDate}`,
    `Booking: ${data.booking.booking_number}`,
    'B I L L E D T O',
    customerName,
    customerEmail,
    customerPhone,
    'NOT AN OFFICIAL RECEIPT',
    'V E H I C L E',
    data.vehicle?.name || 'Vehicle pending',
    vehicleMeta,
    'R E N T A L P E R I O D',
    `${formatDateTime(data.booking.start_at)} → ${formatDateTime(data.booking.end_at)}`,
    formatDuration(data.booking.start_at, data.booking.end_at),
    'T Y P E',
    toRentalLabel(data.booking.rental_model),
    'P I C K - U P · D R O P - O F F',
    'C H A R G E S',
    ...charges.map((charge) => `${charge.label} ${formatCurrency(charge.amount)}`),
    `Rental Total ${formatCurrency(data.booking.total_amount)}`,
    'P A Y M E N T S',
    data.payments.length ? data.payments.map((payment) => `${formatDate(payment.paid_at || payment.created_at)} · ${toPaymentLabel(payment.channel)} ${formatCurrency(payment.amount)}`).join('\n') : 'No payments recorded',
    `Amount Due ${formatCurrency(dueAmount)}`,
    'Please settle the remaining balance on the day of vehicle pickup.',
    'Note: Additional charges may apply for excess usage, vehicle damage beyond normal wear, fuel shortfall, or non-compliance with rental terms. Any extra charges will be communicated',
    'and settled separately.',
    `This is an invoice, not an official receipt. For an official receipt please contact ${BUSINESS_NAME} directly. · ${data.business.support_email || 'tadsuu@gmail.com'} · Generated ${formatDateTime(data.booking.updated_at || data.booking.created_at)}`,
  ].join('\n')
}

function buildInvoiceContent(data: BookingInvoiceData) {
  const parts: string[] = []
  const invoiceNumber = buildInvoiceNumber(data.booking.booking_number)
  const issueDate = formatDate(data.booking.updated_at || data.booking.created_at)
  const businessAddress = data.business.business_address || '11th 12th St., Villamor'
  const customerName = [data.customer?.first_name, data.customer?.last_name].filter(Boolean).join(' ') || data.booking.guest_name || 'Guest customer'
  const customerEmail = data.customer?.email || data.booking.guest_email || '-'
  const customerPhone = data.customer?.mobile || data.booking.guest_mobile || '-'
  const pickupDropoff = [data.booking.pickup_location, data.booking.dropoff_location].filter(Boolean).join(' - ')
  const charges = normalizeCharges(data)
  const payments = data.payments
  const paymentsTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const dueAmount = Number(data.booking.remaining_amount || Math.max(0, data.booking.total_amount - paymentsTotal))

  parts.push('0.1 0.12 0.16 RG 1.5 w')
  parts.push(line(24, 492, 818, 492))
  parts.push(line(24, 379, 818, 379))
  parts.push(line(24, 283, 818, 283))
  parts.push('0.86 0.89 0.94 RG 1 w')
  parts.push(line(24, 149, 818, 149))
  parts.push('0.1 0.12 0.16 RG 1.5 w')
  parts.push(line(24, 224, 818, 224))
  parts.push(rect(694, 439, 124, 24))

  parts.push(text(BUSINESS_NAME, 24, 542, { font: 'F2', size: 18, color: [0.12, 0.13, 0.16] }))
  parts.push(text(businessAddress, 24, 513, { size: 10, color: [0.45, 0.49, 0.56] }))
  parts.push(text(data.business.support_email || 'tadsuu@gmail.com', 24, 494, { size: 10, color: [0.45, 0.49, 0.56] }))

  parts.push(text('I N V O I C E', 818, 548, { font: 'F2', size: 34, align: 'right', color: [0.08, 0.09, 0.12] }))
  parts.push(text(`No: ${invoiceNumber}`, 818, 515, { font: 'F2', size: 10, align: 'right', color: [0.26, 0.31, 0.39] }))
  parts.push(text(`Date: ${issueDate}`, 818, 497, { font: 'F2', size: 10, align: 'right', color: [0.26, 0.31, 0.39] }))
  parts.push(text(`Booking: ${data.booking.booking_number}`, 818, 479, { font: 'F2', size: 10, align: 'right', color: [0.26, 0.31, 0.39] }))

  parts.push(text('B I L L E D T O', 24, 431, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  parts.push(text(customerName, 24, 403, { font: 'F2', size: 14, color: [0.12, 0.13, 0.16] }))
  parts.push(text(customerEmail, 24, 380, { size: 10, color: [0.45, 0.49, 0.56] }))
  parts.push(text(customerPhone, 24, 361, { size: 10, color: [0.45, 0.49, 0.56] }))
  parts.push(text('NOT AN OFFICIAL RECEIPT', 756, 446, { font: 'F2', size: 9, align: 'center', color: [0.45, 0.49, 0.56] }))

  parts.push(text('V E H I C L E', 24, 345, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  parts.push(text(data.vehicle?.name || 'Vehicle pending', 24, 320, { font: 'F2', size: 14, color: [0.12, 0.13, 0.16] }))
  parts.push(text(data.vehicle?.year ? `Toyota · ${data.vehicle.year}` : 'Toyota', 24, 300, { size: 10, color: [0.45, 0.49, 0.56] }))

  parts.push(text('R E N T A L P E R I O D', 184, 345, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  parts.push(text(`${formatDateTime(data.booking.start_at)} → ${formatDateTime(data.booking.end_at)}`, 184, 320, { font: 'F2', size: 12, color: [0.12, 0.13, 0.16] }))
  parts.push(text(formatDuration(data.booking.start_at, data.booking.end_at), 184, 300, { size: 10, color: [0.45, 0.49, 0.56] }))

  parts.push(text('T Y P E', 462, 345, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  parts.push(text(toRentalLabel(data.booking.rental_model), 462, 320, { font: 'F2', size: 14, color: [0.12, 0.13, 0.16] }))

  parts.push(text('P I C K - U P · D R O P - O F F', 610, 345, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  if (pickupDropoff) {
    wrapText(pickupDropoff, 610, 320, 208, 14, { font: 'F2', size: 12, color: [0.12, 0.13, 0.16] }).forEach((entry) => parts.push(entry))
  }

  parts.push(text('C H A R G E S', 24, 252, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  let chargeY = 224
  charges.forEach((charge, index) => {
    parts.push(text(charge.label, 24, chargeY, { size: 11, color: [0.25, 0.3, 0.38] }))
    parts.push(text(formatCurrency(charge.amount), 430, chargeY, { font: 'F2', size: 11, align: 'right', color: charge.muted ? [0.45, 0.49, 0.56] : [0.12, 0.13, 0.16] }))
    if (index < charges.length - 1) {
      parts.push('0.9 0.92 0.95 RG 1 w')
      parts.push(line(24, chargeY - 11, 430, chargeY - 11))
    }
    chargeY -= 22
  })

  parts.push(text('Rental Total', 24, 170, { font: 'F2', size: 12, color: [0.12, 0.13, 0.16] }))
  parts.push(text(formatCurrency(data.booking.total_amount), 430, 170, { font: 'F2', size: 12, align: 'right', color: [0.12, 0.13, 0.16] }))

  parts.push(text('P A Y M E N T S', 488, 252, { font: 'F2', size: 11, color: [0.61, 0.66, 0.73] }))
  if (payments.length === 0) {
    parts.push(text('No payments recorded', 488, 224, { font: 'F3', size: 11, color: [0.61, 0.66, 0.73] }))
  } else {
    let paymentY = 224
    payments.slice(0, 4).forEach((payment) => {
      parts.push(text(`${formatDate(payment.paid_at || payment.created_at)} · ${toPaymentLabel(payment.channel)}`, 488, paymentY, { size: 10, color: [0.25, 0.3, 0.38] }))
      parts.push(text(formatCurrency(payment.amount), 818, paymentY, { font: 'F2', size: 10, align: 'right', color: [0.12, 0.13, 0.16] }))
      if (payment.reference_number) {
        parts.push(text(`Ref ${payment.reference_number}`, 488, paymentY - 14, { size: 9, color: [0.61, 0.66, 0.73] }))
      }
      paymentY -= 32
    })
  }

  parts.push(text('Amount Due', 24, 176, { font: 'F2', size: 16, color: [0.12, 0.13, 0.16] }))
  parts.push(text('Please settle the remaining balance on the day of vehicle pickup.', 24, 139, { size: 10, color: [0.45, 0.49, 0.56] }))
  parts.push(text(formatCurrency(dueAmount), 818, 170, { font: 'F2', size: 26, align: 'right', color: [0.91, 0.16, 0.18] }))

  wrapText(
    'Note: Additional charges may apply for excess usage, vehicle damage beyond normal wear, fuel shortfall, or non-compliance with rental terms. Any extra charges will be communicated and settled separately.',
    24,
    116,
    794,
    13,
    { size: 8.5, color: [0.61, 0.66, 0.73] },
  ).forEach((entry) => parts.push(entry))

  parts.push(text(`This is an invoice, not an official receipt. For an official receipt please contact ${BUSINESS_NAME} directly. · ${data.business.support_email || 'tadsuu@gmail.com'} · Generated ${formatDateTime(data.booking.updated_at || data.booking.created_at)}`, 421, 28, { size: 8, align: 'center', color: [0.68, 0.72, 0.78] }))

  return parts.join('\n')
}

function normalizeCharges(data: BookingInvoiceData) {
  const items = (data.booking.price_line_items || []).map((item) => ({
    label: item.detail ? `${item.label} (${item.detail})` : item.label,
    amount: Number(item.amount || 0),
    muted: /vat/i.test(item.label),
  }))

  if (!items.some((item) => /vat/i.test(item.label))) {
    items.push({ label: `VAT (${data.business.vat_percent}%)`, amount: 0, muted: true })
  }

  return items.slice(0, 6)
}

function buildPdfDocument(objects: string[]) {
  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return pdf
}

function text(value: string, x: number, y: number, options: TextOptions = {}) {
  const font = options.font || 'F1'
  const size = options.size || 12
  const color = options.color || [0, 0, 0]
  const safeText = sanitizePdfText(value)
  const width = estimateTextWidth(safeText, size)
  const dx = options.align === 'right' ? x - width : options.align === 'center' ? x - (width / 2) : x

  return `BT /${font} ${size} Tf ${color.join(' ')} rg 1 0 0 1 ${dx.toFixed(2)} ${y.toFixed(2)} Tm <${encodePdfHexText(safeText)}> Tj ET`
}

function wrapText(value: string, x: number, y: number, maxWidth: number, lineHeight: number, options: TextOptions = {}) {
  const lines = splitLines(value, options.size || 12, maxWidth)
  return lines.map((lineText, index) => text(lineText, x, y - (index * lineHeight), options))
}

function splitLines(value: string, size: number, maxWidth: number) {
  const words = sanitizePdfText(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (estimateTextWidth(next, size) <= maxWidth || !current) {
      current = next
      return
    }
    lines.push(current)
    current = word
  })

  if (current) lines.push(current)
  return lines
}

function line(x1: number, y1: number, x2: number, y2: number) {
  return `${x1} ${y1} m ${x2} ${y2} l S`
}

function rect(x: number, y: number, width: number, height: number) {
  return `${x} ${y} ${width} ${height} re S`
}

function estimateTextWidth(value: string, size: number) {
  return value.length * size * 0.54
}

function sanitizePdfText(value: string) {
  return (value || '-').replace(/\s+/g, ' ').trim() || '-'
}

function encodePdfHexText(value: string) {
  const hex = ['FE', 'FF']

  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) continue
    if (codePoint > 0xffff) continue
    hex.push(codePoint.toString(16).padStart(4, '0').toUpperCase())
  }

  return hex.join('')
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
