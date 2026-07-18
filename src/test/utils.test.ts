import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('filters falsy values', () => {
    expect(cn('a', false, 'b', undefined, null, 'c')).toBe('a b c')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('px-4 bg-red-500', 'px-6')
    expect(result).toContain('px-6')
    expect(result).not.toContain('px-4')
  })
})
