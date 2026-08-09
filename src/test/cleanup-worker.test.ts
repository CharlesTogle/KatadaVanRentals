import { describe, expect, it } from 'vitest'
import { processCleanupQueue } from '../../supabase/functions/process-storage-cleanup-queue/worker'

function client({
  deletion = { data: { id: 'row-1' }, error: null },
  removeError = null,
}: {
  deletion?: { data: { id: string } | null; error: Error | null }
  removeError?: Error | null
} = {}) {
  const updates: unknown[] = []
  const queue = {
    update: (payload: unknown) => { updates.push(payload); return queue },
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

describe('cleanup worker', () => {
  it('does not delete after losing the conditional deletion claim', async () => {
    const fake = client({ deletion: { data: null, error: new Error('lost lease') } })
    await expect(processCleanupQueue(fake)).resolves.toEqual({ cleaned: 0, failed: 1 })
    expect(fake.updates).toHaveLength(1)
  })

  it('retries Storage failures with the original lease conditions', async () => {
    const fake = client({ removeError: new Error('storage failed') })
    await expect(processCleanupQueue(fake)).resolves.toEqual({ cleaned: 0, failed: 1 })
    expect(fake.updates).toEqual([
      { processing_at: expect.any(String), deleting_at: expect.any(String) },
      {
        processing_at: null,
        lease_token: null,
        deleting_at: null,
        available_at: expect.any(String),
        last_error: 'storage failed',
      },
    ])
  })

  it('allows only one concurrent worker to enter deletion', async () => {
    let claimed = false
    let storageDeletes = 0
    let deletionResult: { data: { id: string } | null; error: Error | null } = { data: null, error: null }
    const queue = {
      update: (payload: { deleting_at?: string }) => {
        if (payload.deleting_at) {
          deletionResult = claimed
            ? { data: null, error: null }
            : (claimed = true, { data: { id: 'row-1' }, error: null })
        }
        return queue
      },
      eq: () => queue,
      is: () => queue,
      gt: () => queue,
      select: () => queue,
      maybeSingle: async () => deletionResult,
    }
    const fake = {
      rpc: async () => ({ data: [{ id: 'row-1', lease_token: 'lease-1', bucket: 'business-assets', file_path: 'x' }], error: null }),
      from: () => queue,
      storage: { from: () => ({ remove: async () => { storageDeletes += 1; return { error: null } } }) },
    }

    await Promise.all([processCleanupQueue(fake), processCleanupQueue(fake)])

    expect(storageDeletes).toBe(1)
  })

})
