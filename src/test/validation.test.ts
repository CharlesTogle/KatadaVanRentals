import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidPassword } from '@/lib/validation'

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('test+tag@domain.org')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('not-email')).toBe(false)
    expect(isValidEmail('@no-user.com')).toBe(false)
    expect(isValidEmail('no-domain@')).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('accepts passwords of 6+ characters', () => {
    expect(isValidPassword('123456')).toBe(true)
    expect(isValidPassword('abcdefgh')).toBe(true)
  })

  it('rejects short passwords', () => {
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword('12345')).toBe(false)
  })
})
