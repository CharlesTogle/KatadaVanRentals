create table public.booking_email_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  recipient_email text not null,
  first_name text not null default 'there',
  booking_number text not null,
  email_type text not null,
  reason text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'failed', 'sent')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  available_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, email_type)
);

alter table public.booking_email_outbox enable row level security;

create index booking_email_outbox_pending_idx
  on public.booking_email_outbox (available_at, created_at)
  where status in ('queued', 'failed', 'processing');

revoke all on table public.booking_email_outbox from public, anon, authenticated;
grant all on table public.booking_email_outbox to service_role;

create or replace function public.queue_booking_cancellation_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.booking_email_outbox (
    booking_id,
    recipient_email,
    first_name,
    booking_number,
    email_type,
    reason
  )
  select b.id,
         coalesce(nullif(p.email, ''), nullif(b.guest_email, '')),
         coalesce(nullif(p.first_name, ''), nullif(b.guest_name, ''), 'there'),
         b.booking_number,
         'booking_canceled',
         coalesce(new.reason, 'Booking was canceled.')
  from public.bookings b
  left join public.profiles p on p.id = b.customer_id
  where b.id = new.booking_id
    and coalesce(nullif(p.email, ''), nullif(b.guest_email, '')) is not null
  on conflict (booking_id, email_type) do nothing;

  return new;
end;
$$;

drop trigger if exists queue_booking_cancellation_email on public.booking_cancellations;

create trigger queue_booking_cancellation_email
after insert on public.booking_cancellations
for each row execute function public.queue_booking_cancellation_email();

create or replace function public.cancel_expired_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expiry_hours integer;
  v_canceled_count integer;
  v_run_started_at timestamptz := now();
begin
  select booking_expiry_hours
    into v_expiry_hours
  from public.app_settings
  where id = true;

  v_expiry_hours := coalesce(v_expiry_hours, 2);

  create temp table expired_bookings (
    id uuid primary key,
    previous_status public.booking_status not null
  ) on commit drop;

  insert into expired_bookings (id, previous_status)
  select id, status
  from public.bookings
  where status in ('for_review', 'awaiting_documents')
    and start_at <= now() + make_interval(hours => v_expiry_hours)
  for update;

  update public.bookings as b
  set status = 'canceled',
      canceled_at = now(),
      updated_at = now()
  from expired_bookings e
  where b.id = e.id;

  insert into public.booking_cancellations (booking_id, cancellation_type, reason)
  select id,
         'system_expiry',
         case previous_status
           when 'for_review' then 'Booking was not confirmed before the approval deadline.'
           when 'awaiting_documents' then 'Required documents were not uploaded before the deadline.'
         end
  from expired_bookings;

  update public.booking_status_events as e
  set note = case expired.previous_status
    when 'for_review' then 'Automatically canceled: booking was not confirmed before the approval deadline.'
    when 'awaiting_documents' then 'Automatically canceled: required documents were not uploaded before the deadline.'
  end
  from expired_bookings expired
  where e.booking_id = expired.id
    and e.to_status = 'canceled'
    and e.note is null
    and e.created_at >= v_run_started_at;

  select count(*) into v_canceled_count from expired_bookings;
  return v_canceled_count;
end;
$$;

create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname = 'process-booking-email-outbox';

select cron.schedule(
  'process-booking-email-outbox',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/process-booking-email-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );
  $job$
);
