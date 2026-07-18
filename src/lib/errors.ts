import type { PostgrestError, AuthError } from '@supabase/supabase-js'
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
  'Invalid login credentials': 'Incorrect email or password. Check your credentials and try again.',
  'User already registered': 'An account with this email already exists. Try logging in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters. Choose a longer password.',
  'Email not confirmed': 'Please verify your email first. Check your inbox for the confirmation link.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a moment before trying again.',
  'User not found': 'No account found with this email. Check the email or create a new account.',
  'Invalid email or password': 'Incorrect email or password. Check your credentials and try again.',
  'For security purposes, you can only request this after': 'Please wait before trying again. This is a security measure.',
  'Too many requests': 'Too many requests. Please wait a moment before trying again.',
}

export function showError(error: PostgrestError | AuthError | Error | null): string {
  if (!error) return ''

  const path = typeof window !== 'undefined' ? window.location.pathname : undefined

  if ('code' in error && error.code && postgrestMap[error.code]) {
    return postgrestMap[error.code]
  }

  if ('message' in error && error.message) {
    for (const [key, msg] of Object.entries(authMap)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return msg
      }
    }
    logError('client', 'Unmapped error', error, { path, requestId: getRequestId() })
    return 'An unknown error occurred. Please try again later.'
  }

  logError('client', 'Unparseable error', error, { path, requestId: getRequestId() })
  return 'Something went wrong. Please try again later or contact support.'
}
