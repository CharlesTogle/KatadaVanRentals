export const BRAND_NAVY = '#071f52'
export const BRAND_RED = '#e92935'
export const BRAND_YELLOW = '#ffd923'
export const BRAND_LIGHT = '#f7f9ff'

export const APP_NAME = 'Katada Van Rentals'
export const DEFAULT_COUNTRY = 'Philippines'
export const DEFAULT_CURRENCY = 'PHP'
export const DEFAULT_LOCALE = 'en-PH'

const CUSTOMER_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const VEHICLE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const BUSINESS_ASSET_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export const UPLOAD_POLICIES = {
  customerDocuments: { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: CUSTOMER_DOCUMENT_MIME_TYPES, accept: CUSTOMER_DOCUMENT_MIME_TYPES.join(',') },
  paymentReceipts: { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: CUSTOMER_DOCUMENT_MIME_TYPES, accept: CUSTOMER_DOCUMENT_MIME_TYPES.join(',') },
  vehicleImages: { maxBytes: 10 * 1024 * 1024, allowedMimeTypes: VEHICLE_IMAGE_MIME_TYPES, accept: VEHICLE_IMAGE_MIME_TYPES.join(',') },
  businessAssets: { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: BUSINESS_ASSET_MIME_TYPES, accept: BUSINESS_ASSET_MIME_TYPES.join(',') },
} as const

export const STATUS_COLORS: Record<string, string> = {
  for_review: 'bg-[#ffd923]/20 text-[#b8860b]',
  awaiting_documents: 'bg-[#e92935]/10 text-[#c91f2a]',
  pending_price_approval: 'bg-[#ffd923]/20 text-[#b8860b]',
  confirmed: 'bg-[#16a34a]/10 text-[#16a34a]',
  rejected: 'bg-[#e92935]/10 text-[#c91f2a]',
  canceled: 'bg-gray-100 text-gray-500',
  on_trip: 'bg-[#071f52]/10 text-[#071f52]',
  completed: 'bg-[#16a34a]/10 text-[#16a34a]',
}
