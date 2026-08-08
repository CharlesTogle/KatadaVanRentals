import { afterEach, describe, expect, it, vi } from 'vitest'
import { logError, logFatal } from '@/lib/logger'

describe('logger error payloads', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps the reason and stack for unknown errors', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('route parser failed')

    logError('client', 'Unmapped error', error)

    const entry = JSON.parse(output.mock.calls[0][0] as string)
    expect(entry.error).toMatchObject({
      name: 'Error',
      message: 'route parser failed',
      reason: 'route parser failed',
    })
    expect(entry.error.stack).toContain('route parser failed')
  })

  it('serializes uncaught non-Error rejection reasons', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {})

    logFatal('client', 'Uncaught error', { reason: 'third-party failure', stack: 'stack line' })

    const entry = JSON.parse(output.mock.calls[0][0] as string)
    expect(entry.error).toMatchObject({
      name: 'UnknownError',
      message: '[object Object]',
      reason: 'third-party failure',
      stack: 'stack line',
    })
  })
})
