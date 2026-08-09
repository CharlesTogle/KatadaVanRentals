import { logError, getRequestId } from './logger'

const postgrestMap: Record<string, string> = {
  '42501': 'You don\'t have permission to do that. Contact your administrator if you need access.',
  '23505': 'This already exists. Try using a different value.',
  '23503': 'Referenced record not found. Check that the related record exists.',
  '23502': 'A required field is missing. Fill in all required fields and try again.',
  '23514': 'A value doesn\'t meet the requirements. Check your input and try again.',
  '42P01': 'Something went wrong on our end. Please try again later.',
  '42703': 'Something went wrong on our end. Please try again later.',
  '22P02': 'Invalid input format. Check your input and try again.',
  'PGRST116': 'No record found for your account. Make sure you\'re logged in correctly.',
}

const authMap: Record<string, string> = {
  'Failed to create customer account': 'We can\'t create an account using that email, please choose another email',
  'Can\'t create customer account': 'We can\'t create an account using that email, please choose another email',
  'Edge Function returned a non-2xx status code': 'Something went wrong. Please try again later.',
  'Invalid login credentials': 'Incorrect email or password. Check your credentials and try again.',
  'User already registered': 'An account with this email already exists. Try logging in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters. Choose a longer password.',
  'New password should be different from the old password': 'New password should be different from the old password.',
  'Email not confirmed': 'Please verify your email first. Check your inbox for the confirmation link.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a moment before trying again.',
  'User not found': 'No account found with this email. Check the email or create a new account.',
  'Invalid email or password': 'Incorrect email or password. Check your credentials and try again.',
  'For security purposes, you can only request this after': 'Please wait before trying again. This is a security measure.',
  'Too many requests': 'Too many requests. Please wait a moment before trying again.',
  'Invalid toll plaza selection': 'We can\'t compute the toll price yet. We\'ll confirm the toll after the trip.',
}

const functionMap: Record<string, string> = {
  INVALID_TOLL_SELECTION: 'We can\'t compute the toll price yet. We\'ll confirm the toll after the trip.',
  ROUTE_NOT_FOUND: 'No drivable route was found. Choose a more specific nearby road, landmark, or terminal.',
  ROUTE_CALCULATION_FAILED: 'Route calculation is temporarily unavailable. Please try again.',
  LOCATION_LOOKUP_FAILED: 'Location search is temporarily unavailable. Try again or enter a more specific address.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  RATE_LIMIT_UNAVAILABLE: 'This service is temporarily unavailable. Please try again later.',
  CONFIGURATION_ERROR: 'Something went wrong on our end. Please try again later or contact support.',
  INVALID_INPUT: 'Check the highlighted details and try again.',
  VEHICLE_NOT_FOUND: 'The selected vehicle is no longer available.',
  CUSTOMER_HAS_BOOKINGS: 'This customer has bookings and cannot be deleted. Deactivate the account instead.',
  INVALID_VEHICLE_SETTINGS: 'This vehicle is missing a valid fuel-efficiency setting.',
  VEHICLE_UNAVAILABLE: 'Vehicle is not available for these dates. Choose different dates or another vehicle.',
  CUSTOMER_NOT_FOUND: 'The selected customer could not be found.',
  CUSTOMER_CREATE_FAILED: 'We could not create the customer account. Check the details and try again.',
  BOOKING_CREATE_FAILED: 'We could not create the booking. Please try again.',
  EMAIL_DELIVERY_FAILED: 'The booking was received, but the confirmation email could not be sent.',
}

const unrecoverablePostgrestCodes = new Set(['42P01', '42703'])
const safeBusinessErrors = new Set(['Collected amount exceeds the outstanding balance'])

export function showError(error: unknown): string {
  if (!error) return ''

  const path = typeof window !== 'undefined' ? window.location.pathname : undefined

  if (typeof error === 'object' && error !== null && 'errorCode' in error && typeof error.errorCode === 'string') {
    const errorCode = error.errorCode
    if (functionMap[errorCode]) return functionMap[errorCode]
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P0001') {
    logError('client', 'Database business error', error, { path, requestId: getRequestId() })
    if ('message' in error && typeof error.message === 'string' && safeBusinessErrors.has(error.message)) return error.message
    return 'Something went wrong. Please try again later.'
  }

  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' && postgrestMap[error.code]) {
    if (unrecoverablePostgrestCodes.has(error.code)) {
      logError('client', 'Unrecoverable database error', error, { path, requestId: getRequestId() })
    }
    return postgrestMap[error.code]
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message) {
    const message = error.message
    if (message.startsWith('File is too large.')) return `${message} Choose a smaller file and try again.`
    for (const [key, msg] of Object.entries(authMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return msg
      }
    }
    logError('client', 'Unmapped error', error, { path, requestId: getRequestId() })
    return 'An unknown error occurred. Please try again later.'
  }

  logError('client', 'Unparseable error', error, { path, requestId: getRequestId() })
  return 'Something went wrong. Please try again later or contact support.'
}
