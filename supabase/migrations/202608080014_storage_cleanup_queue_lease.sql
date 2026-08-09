drop policy if exists "users can queue their own customer document cleanup" on public.storage_cleanup_queue;

alter table public.storage_cleanup_queue
  add column if not exists lease_token uuid;

alter table public.storage_cleanup_queue
  add column if not exists deleting_at timestamptz;

create policy "users can queue allowed storage cleanup"
  on public.storage_cleanup_queue
  for insert
  with check (
    (bucket in ('customer-documents', 'payment-receipts') and (
      public.is_admin()
      or (storage.foldername(file_path))[1] = auth.uid()::text
      or (storage.foldername(file_path))[2] = auth.uid()::text
    ))
    or (bucket = 'business-assets' and (
      public.is_admin()
      or file_path like 'profile-photos/' || auth.uid()::text || '-%'
      or file_path like 'profile-photos/' || auth.uid()::text || '.%'
    ))
    or (bucket = 'vehicle-images' and public.is_admin())
  );

create or replace function public.claim_storage_cleanup_queue(batch_size integer default 100)
returns setof public.storage_cleanup_queue
language sql
security definer
set search_path = public
as $$
  update public.storage_cleanup_queue as queue
  set processing_at = now(), lease_token = gen_random_uuid(), deleting_at = null, attempts = queue.attempts + 1
  where queue.id in (
    select candidate.id
    from public.storage_cleanup_queue candidate
    where candidate.cleaned_at is null
      and (candidate.processing_at is null or candidate.processing_at < now() - interval '10 minutes')
      and (candidate.deleting_at is null or candidate.deleting_at < now() - interval '10 minutes')
      and candidate.available_at <= now()
    order by candidate.created_at
    limit greatest(batch_size, 1)
    for update skip locked
  )
  returning queue.*;
$$;

delete from public.storage_cleanup_queue duplicate
using public.storage_cleanup_queue keeper
where duplicate.cleaned_at is null
  and keeper.cleaned_at is null
  and duplicate.bucket = keeper.bucket
  and duplicate.file_path = keeper.file_path
  and duplicate.id > keeper.id;

create unique index if not exists storage_cleanup_queue_active_path_idx
  on public.storage_cleanup_queue (bucket, file_path)
  where cleaned_at is null;
