create or replace function public.accept_own_price_adjustment(target_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_total numeric;
  current_remaining numeric;
  pickup_at timestamptz;
  latest_note text;
  adjusted_total numeric;
  is_out_of_area boolean;
  expiry_hours integer;
begin
  select total_amount, remaining_amount, start_at, coalesce(in_service_area, true) = false
    into current_total, current_remaining, pickup_at, is_out_of_area
  from public.bookings
  where id = target_booking_id
    and customer_id = auth.uid()
    and status = 'pending_price_approval';

  if current_total is null then
    raise exception 'Price adjustment cannot be accepted by this customer';
  end if;

  select coalesce(booking_expiry_hours, 2)
    into expiry_hours
  from public.app_settings
  where id = true;

  expiry_hours := coalesce(expiry_hours, 2);

  if now() > pickup_at - make_interval(hours => expiry_hours) then
    update public.bookings
    set status = 'canceled',
        canceled_at = now(),
        updated_at = now()
    where id = target_booking_id;

    insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by)
    values (target_booking_id, 'customer_request', 'Price adjustment approval deadline passed.', auth.uid());

    insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
    values (target_booking_id, 'pending_price_approval', 'canceled', 'Price adjustment approval deadline passed.', auth.uid());

    return;
  end if;

  select note
    into latest_note
  from public.booking_status_events
  where booking_id = target_booking_id
    and note ~* '^Price (adjusted to|set to)\s+[0-9,.]+\.\s+Reason:'
  order by created_at desc
  limit 1;

  adjusted_total := coalesce(
    nullif(replace(substring(latest_note from '^Price (adjusted to|set to)\s+([0-9,.]+)\.\s+Reason:'), ',', ''), '')::numeric,
    current_total
  );

  update public.bookings
  set total_amount = adjusted_total,
      deposit_amount = coalesce((
        select sum(amount) from public.payments where booking_id = target_booking_id and status = 'submitted'
      ), 0),
      remaining_amount = adjusted_total - coalesce((
        select sum(amount) from public.payments where booking_id = target_booking_id and status = 'submitted'
      ), 0),
      status = case when not is_out_of_area then 'confirmed'::public.booking_status else 'for_review'::public.booking_status end,
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'pending_price_approval', case when not is_out_of_area then 'confirmed'::public.booking_status else 'for_review'::public.booking_status end, 'Customer accepted price adjustment.', auth.uid());
end;
$$;
