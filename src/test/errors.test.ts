import { describe, it, expect } from 'vitest'
import { showError } from '@/lib/errors'

describe('showError', () => {
  it('returns empty string for null', () => {
    expect(showError(null)).toBe('')
  })

  it('maps known postgrest error codes', () => {
    expect(showError({ code: '23505', message: 'duplicate key', details: '', hint: '' }))
      .toContain('already exists')
    expect(showError({ code: '23502', message: 'not null', details: '', hint: '' }))
      .toContain('required field')
    expect(showError({ code: '23503', message: 'FK', details: '', hint: '' }))
      .toContain('Referenced record')
  })

  it('maps known auth errors', () => {
    expect(showError(new Error('Invalid login credentials')))
      .toContain('Incorrect email or password')
    expect(showError(new Error('User already registered')))
      .toContain('already exists')
    expect(showError(new Error('Password should be at least 6 characters')))
      .toContain('at least 6 characters')
  })

  it('returns generic message for unknown errors', () => {
    const result = showError(new Error('Some unexpected thing'))
    expect(result).toBeTruthy()
    expect(result).not.toBe('')
  })
})
