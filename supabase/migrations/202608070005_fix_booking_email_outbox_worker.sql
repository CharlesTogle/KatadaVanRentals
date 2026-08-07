create or replace function public.claim_booking_email_outbox(batch_size integer default 100)
returns setof public.booking_email_outbox
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.booking_email_outbox
    where attempts < 3
      and (
        status in ('queued', 'failed')
        or (status = 'processing' and available_at <= now())
      )
      and available_at <= now()
    order by created_at
    for update skip locked
    limit greatest(batch_size, 1)
  )
  update public.booking_email_outbox as outbox
  set status = 'processing',
      attempts = outbox.attempts + 1,
      available_at = now() + interval '10 minutes',
      last_error = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
$$;

revoke all on function public.claim_booking_email_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_booking_email_outbox(integer) to service_role;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'SUPABASE_URL'
  ) or not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'SUPABASE_SERVICE_ROLE_KEY'
  ) then
    raise exception 'Missing Vault secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required by process-booking-email-outbox';
  end if;
end;
$$;
