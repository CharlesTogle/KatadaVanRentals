export async function processCleanupQueue(supabase: any, now = () => new Date()) {
  const { data: queued, error: claimError } = await supabase.rpc('claim_storage_cleanup_queue', { batch_size: 100 })
  if (claimError) return { errorCode: 'CLEANUP_QUEUE_LOAD_FAILED', status: 500 }

  let cleaned = 0
  let failed = 0
  for (const item of queued || []) {
    const deletionStartedAt = now().toISOString()
    const { data: deletion, error: deletionError } = await supabase
      .from('storage_cleanup_queue')
      .update({ processing_at: deletionStartedAt, deleting_at: deletionStartedAt })
      .eq('id', item.id)
      .eq('lease_token', item.lease_token)
      .is('cleaned_at', null)
      .gt('processing_at', new Date(now().getTime() - 10 * 60 * 1000).toISOString())
      .is('deleting_at', null)
      .select('id')
      .maybeSingle()

    if (deletionError) {
      failed += 1
      continue
    }
    if (!deletion) continue

    let leaseLost = false
    const heartbeat = setInterval(async () => {
      const { data, error } = await supabase
        .from('storage_cleanup_queue')
        .update({ processing_at: now().toISOString() })
        .eq('id', item.id)
        .eq('lease_token', item.lease_token)
        .eq('deleting_at', deletionStartedAt)
        .is('cleaned_at', null)
        .select('id')
        .maybeSingle()
      if (error || !data) leaseLost = true
    }, 60_000)

    const { error: removeError } = await supabase.storage.from(item.bucket).remove([item.file_path])
    clearInterval(heartbeat)
    if (leaseLost) continue
    if (removeError) {
      failed += 1
      await supabase.from('storage_cleanup_queue').update({
        processing_at: null,
        lease_token: null,
        deleting_at: null,
        available_at: new Date(now().getTime() + 5 * 60 * 1000).toISOString(),
        last_error: removeError.message,
      }).eq('id', item.id).eq('lease_token', item.lease_token).eq('deleting_at', deletionStartedAt)
      continue
    }

    cleaned += 1
    await supabase.from('storage_cleanup_queue').update({
      cleaned_at: now().toISOString(),
      processing_at: null,
      lease_token: null,
      deleting_at: null,
    }).eq('id', item.id).eq('lease_token', item.lease_token).eq('deleting_at', deletionStartedAt)
  }

  return { cleaned, failed }
}
