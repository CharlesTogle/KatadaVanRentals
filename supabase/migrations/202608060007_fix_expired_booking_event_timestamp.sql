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
    and start_at <= now() + make_interval(hours => v_expiry_hours);

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
