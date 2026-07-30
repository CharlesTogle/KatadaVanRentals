import { describe, it, expect } from 'vitest'
import { getPasswordRequirementChecks, isValidEmail, isValidPassword } from '@/lib/validation'

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
  it('accepts passwords that satisfy the full policy', () => {
    expect(isValidPassword('Password1!')).toBe(true)
  })

  it('rejects passwords that miss any requirement', () => {
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword('12345')).toBe(false)
    expect(isValidPassword('password1!')).toBe(false)
    expect(isValidPassword('PASSWORD1!')).toBe(false)
    expect(isValidPassword('Password!!')).toBe(false)
    expect(isValidPassword('Password1')).toBe(false)
  })
})

describe('getPasswordRequirementChecks', () => {
  it('reports each requirement status', () => {
    expect(getPasswordRequirementChecks('Password1!')).toEqual([
      { label: '8 characters', satisfied: true },
      { label: '1 uppercase letter', satisfied: true },
      { label: '1 lowercase letter', satisfied: true },
      { label: '1 number', satisfied: true },
      { label: '1 special character', satisfied: true },
    ])
  })
})
