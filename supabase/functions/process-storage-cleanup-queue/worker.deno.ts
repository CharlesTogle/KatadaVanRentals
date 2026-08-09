import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { processCleanupQueue } from './worker.ts'

const now = () => new Date('2026-08-09T00:00:00.000Z')

function client({
  deletion = { data: { id: 'row-1' }, error: null },
  removeError = null,
}: {
  deletion?: { data: { id: string } | null; error: Error | null }
  removeError?: Error | null
} = {}) {
  const updates: unknown[] = []
  const queue = {
    update: (payload: unknown) => {
      updates.push(payload)
      return queue
    },
    eq: () => queue,
    is: () => queue,
    gt: () => queue,
    select: () => queue,
    maybeSingle: async () => deletion,
  }
  return {
    updates,
    rpc: async () => ({ data: [{ id: 'row-1', lease_token: 'lease-1', bucket: 'business-assets', file_path: 'x' }], error: null }),
    from: () => queue,
    storage: { from: () => ({ remove: async () => ({ error: removeError }) }) },
  }
}

Deno.test('does not touch Storage when deletion ownership update fails', async () => {
  const fake = client({ deletion: { data: null, error: new Error('lost lease') } })
  const result = await processCleanupQueue(fake, now)
  assertEquals(result, { cleaned: 0, failed: 1 })
  assertEquals(fake.updates.length, 1)
})

Deno.test('conditionally finalizes a successful Storage deletion', async () => {
  const fake = client()
  const result = await processCleanupQueue(fake, now)
  assertEquals(result, { cleaned: 1, failed: 0 })
  assertEquals(fake.updates, [
    { processing_at: '2026-08-09T00:00:00.000Z', deleting_at: '2026-08-09T00:00:00.000Z' },
    { cleaned_at: '2026-08-09T00:00:00.000Z', processing_at: null, lease_token: null, deleting_at: null },
  ])
})
