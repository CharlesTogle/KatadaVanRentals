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
begin
  select total_amount, remaining_amount, start_at
    into current_total, current_remaining, pickup_at
  from public.bookings
  where id = target_booking_id
    and customer_id = auth.uid()
    and status = 'pending_price_approval';

  if current_total is null then
    raise exception 'Price adjustment cannot be accepted by this customer';
  end if;

  if now() > pickup_at - interval '2 hours' then
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
    and note ~* '^Price adjusted to\s+[0-9,.]+\.\s+Reason:'
  order by created_at desc
  limit 1;

  adjusted_total := coalesce(
    nullif(replace(substring(latest_note from '^Price adjusted to\s+([0-9,.]+)\.\s+Reason:'), ',', ''), '')::numeric,
    current_total
  );

  update public.bookings
  set total_amount = adjusted_total,
      remaining_amount = greatest(current_remaining + (adjusted_total - current_total), 0),
      status = 'confirmed',
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'pending_price_approval', 'confirmed', 'Customer accepted price adjustment.', auth.uid());
end;
$$;

grant execute on function public.accept_own_price_adjustment(uuid) to authenticated;
