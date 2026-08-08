import { describe, it, expect } from 'vitest'
import { showError } from '@/lib/errors'
import type { PostgrestError } from '@supabase/supabase-js'

describe('showError', () => {
  it('returns empty string for null', () => {
    expect(showError(null)).toBe('')
  })

  it('maps known postgrest error codes', () => {
    expect(showError({ code: '23505', message: 'duplicate key', details: '', hint: '' } as PostgrestError))
      .toContain('already exists')
    expect(showError({ code: '23502', message: 'not null', details: '', hint: '' } as PostgrestError))
      .toContain('required field')
    expect(showError({ code: '23503', message: 'FK', details: '', hint: '' } as PostgrestError))
      .toContain('Referenced record')
  })

  it('maps known auth errors', () => {
    expect(showError(new Error('Invalid login credentials')))
      .toContain('Incorrect email or password')
    expect(showError(new Error('User already registered')))
      .toContain('already exists')
    expect(showError(new Error('Password should be at least 6 characters')))
      .toContain('at least 6 characters')
    expect(showError(new Error('New password should be different from the old password.')))
      .toBe('New password should be different from the old password.')
  })

  it('hides Supabase edge-function and customer-account implementation errors', () => {
    expect(showError(new Error('Edge Function returned a non-2xx status code')))
      .toBe('Something went wrong. Please try again later.')
    expect(showError(new Error('Failed to create customer account')))
      .toBe('We can\'t create an account using that email, please choose another email')
  })

  it('returns generic message for unknown errors', () => {
    const result = showError(new Error('Some unexpected thing'))
    expect(result).toBeTruthy()
    expect(result).not.toBe('')
  })

  it('maps safe edge-function error codes without trusting provider text', () => {
    expect(showError({ errorCode: 'ROUTE_NOT_FOUND', message: 'upstream database detail' }))
      .toContain('No drivable route')
    expect(showError({ errorCode: 'INVALID_TOLL_SELECTION', message: 'internal provider detail' }))
      .toContain('toll price')
    expect(showError({ errorCode: 'VEHICLE_UNAVAILABLE', message: 'legacy conflict detail' }))
      .toContain('not available')
    expect(showError({ errorCode: 'ROUTE_CALCULATION_FAILED' })).toContain('temporarily unavailable')
    expect(showError({ errorCode: 'LOCATION_LOOKUP_FAILED' })).toContain('Location search')
    expect(showError({ errorCode: 'RATE_LIMIT_UNAVAILABLE' })).toContain('temporarily unavailable')
    expect(showError({ errorCode: 'CONFIGURATION_ERROR' })).toContain('contact support')
  })

  it('does not render arbitrary database-raised messages', () => {
    expect(showError({ code: 'P0001', message: 'secret schema detail', details: '', hint: '' }))
      .not.toContain('secret schema detail')
  })

  it('does not trust booking/customer wording in P0001 messages', () => {
    expect(showError({ code: 'P0001', message: 'booking/customer relation secret', details: '', hint: '' }))
      .not.toContain('booking/customer relation secret')
  })
})
