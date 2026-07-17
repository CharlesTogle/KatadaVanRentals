import type { PostgrestError, AuthError } from '@supabase/supabase-js'

const postgrestMap: Record<string, string> = {
  '42501': 'You don\'t have permission to do that.',
  '23505': 'This already exists.',
  '23503': 'Referenced record not found.',
  '23502': 'A required field is missing.',
  '23514': 'A value doesn\'t meet the requirements.',
  '42P01': 'Something went wrong on our end.',
  '42703': 'Something went wrong on our end.',
  '22P02': 'Invalid input format.',
  'PGRST116': 'No record found for your account.',
}

const authMap: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'Email not confirmed': 'Please verify your email first.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a moment.',
  'User not found': 'No account found with this email.',
  'Invalid email or password': 'Incorrect email or password.',
  'For security purposes, you can only request this after': 'Please wait before trying again.',
}

export function friendlyError(error: PostgrestError | AuthError | Error | null): string {
  if (!error) return ''

  if ('code' in error && error.code && postgrestMap[error.code]) {
    return postgrestMap[error.code]
  }

  if ('message' in error && error.message) {
    for (const [key, msg] of Object.entries(authMap)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return msg
      }
    }
    return error.message
  }

  return 'Something went wrong. Please try again.'
}
