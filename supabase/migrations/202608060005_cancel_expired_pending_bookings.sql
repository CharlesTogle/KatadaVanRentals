create extension if not exists pg_cron with schema extensions;

create or replace function public.cancel_expired_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expiry_hours integer;
  v_canceled_count integer;
begin
  select booking_expiry_hours
    into v_expiry_hours
  from public.app_settings
  where id = true;

  v_expiry_hours := coalesce(v_expiry_hours, 2);

  with expired_candidates as materialized (
    select id, status as previous_status
    from public.bookings
    where status in ('for_review', 'awaiting_documents')
      and start_at <= now() + make_interval(hours => v_expiry_hours)
  ),
  expired as (
    update public.bookings as b
    set status = 'canceled',
        canceled_at = now(),
        updated_at = now()
    from expired_candidates c
    where b.id = c.id
    returning b.id, c.previous_status
  ),
  cancellation_records as (
    insert into public.booking_cancellations (booking_id, cancellation_type, reason)
    select id,
           'system_expiry',
           case previous_status
             when 'for_review' then 'Booking was not confirmed before the approval deadline.'
             when 'awaiting_documents' then 'Required documents were not uploaded before the deadline.'
           end
    from expired
    returning booking_id
  )
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  select e.id,
         e.previous_status,
         'canceled',
         case e.previous_status
           when 'for_review' then 'Automatically canceled: booking was not confirmed before the approval deadline.'
           when 'awaiting_documents' then 'Automatically canceled: required documents were not uploaded before the deadline.'
         end,
         null
  from expired e;

  get diagnostics v_canceled_count = row_count;
  return v_canceled_count;
end;
$$;

revoke all on function public.cancel_expired_pending_bookings() from public, anon, authenticated;
grant execute on function public.cancel_expired_pending_bookings() to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'cancel-expired-pending-bookings';

select cron.schedule(
  'cancel-expired-pending-bookings',
  '*/5 * * * *',
  $$select public.cancel_expired_pending_bookings();$$
);
