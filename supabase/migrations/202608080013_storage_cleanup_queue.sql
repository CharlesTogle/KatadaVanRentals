create table public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  file_path text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  cleaned_at timestamptz,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  processing_at timestamptz,
  last_error text
);

alter table public.storage_cleanup_queue enable row level security;

create policy "users can queue their own customer document cleanup"
  on public.storage_cleanup_queue
  for insert
  with check (
    bucket = 'customer-documents'
    and (storage.foldername(file_path))[1] = auth.uid()::text
  );

revoke all on table public.storage_cleanup_queue from public, anon;
grant insert on table public.storage_cleanup_queue to authenticated;

create or replace function public.claim_storage_cleanup_queue(batch_size integer default 100)
returns setof public.storage_cleanup_queue
language sql
security definer
set search_path = public
as $$
  update public.storage_cleanup_queue as queue
  set processing_at = now(), attempts = queue.attempts + 1
  where queue.id in (
    select candidate.id
    from public.storage_cleanup_queue candidate
    where candidate.cleaned_at is null
      and candidate.processing_at is null
      and candidate.available_at <= now()
    order by candidate.created_at
    limit greatest(batch_size, 1)
    for update skip locked
  )
  returning queue.*;
$$;

revoke all on function public.claim_storage_cleanup_queue(integer) from public, anon, authenticated;
grant execute on function public.claim_storage_cleanup_queue(integer) to service_role;

create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname = 'process-storage-cleanup-queue';

select cron.schedule(
  'process-storage-cleanup-queue',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/process-storage-cleanup-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );
  $job$
);
