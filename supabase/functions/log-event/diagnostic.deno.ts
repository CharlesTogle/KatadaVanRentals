import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { normalizeDiagnosticEvent, parseDiagnosticBody } from './diagnostic.ts'

Deno.test('retains bounded diagnostic fields and request correlation', () => {
  const entry = normalizeDiagnosticEvent({
    service: 'x'.repeat(100),
    message: 'reason',
    context: { userId: 'user-1', path: '/booking' },
    error: {
      name: 'Error',
      message: 'failure',
      reason: 'failure reason',
      stack: 'stack trace',
      code: 'E_TEST',
    },
  }, 'request-1', 'test')

  assertEquals(entry.requestId, 'request-1')
  assertEquals(entry.service.length, 50)
  assertEquals(entry.errorName, 'Error')
  assertEquals(entry.errorMessage, 'failure')
  assertEquals(entry.errorReason, 'failure reason')
  assertEquals(entry.errorStack, 'stack trace')
  assertEquals(entry.errorCode, 'E_TEST')
  assertEquals(entry.context?.path, '/booking')
})

Deno.test('rejects malformed diagnostic JSON', () => {
  assertThrows(() => parseDiagnosticBody('{malformed'))
})
