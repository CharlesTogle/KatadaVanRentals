create or replace function public.admin_adjust_booking_price(
  target_booking_id uuid,
  adjusted_total numeric,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
  current_total numeric;
  current_remaining numeric;
  next_status public.booking_status;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select status, total_amount, remaining_amount
    into current_status, current_total, current_remaining
  from public.bookings
  where id = target_booking_id;

  if current_status is null then
    raise exception 'Booking not found';
  end if;

  if current_status not in ('for_review', 'awaiting_documents', 'pending_price_approval') then
    raise exception 'Booking price cannot be adjusted from current status';
  end if;

  next_status := case
    when adjusted_total > current_total then 'pending_price_approval'::public.booking_status
    else 'confirmed'::public.booking_status
  end;

  update public.bookings
  set total_amount = adjusted_total,
      remaining_amount = greatest(current_remaining + (adjusted_total - current_total), 0),
      status = next_status,
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, next_status, format('Price adjusted to %s. Reason: %s', adjusted_total, reason), auth.uid());
end;
$$;

grant execute on function public.admin_adjust_booking_price(uuid, numeric, text) to authenticated;

create or replace function public.admin_extend_booking(
  target_booking_id uuid,
  new_end_at timestamptz,
  extension_amount numeric,
  reason text default null,
  collect_now boolean default false,
  payment_method_id uuid default null,
  payment_channel payment_channel default null,
  reference_number text default null,
  receipt_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_end_at timestamptz;
  current_status public.booking_status;
  payment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select end_at, status
    into current_end_at, current_status
  from public.bookings
  where id = target_booking_id;

  if current_end_at is null then
    raise exception 'Booking not found';
  end if;

  if current_status not in ('confirmed', 'on_trip') then
    raise exception 'Booking cannot be extended from current status';
  end if;

  if collect_now and extension_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, coalesce(payment_channel, 'cash'), 'verified', extension_amount, reference_number, receipt_path, now(), auth.uid())
    returning id into payment_id;
  end if;

  insert into public.booking_extensions (booking_id, previous_end_at, new_end_at, extension_amount, reason, payment_id, created_by)
  values (target_booking_id, current_end_at, new_end_at, extension_amount, reason, payment_id, auth.uid());

  update public.bookings
  set end_at = new_end_at,
      total_amount = total_amount + extension_amount,
      remaining_amount = remaining_amount + extension_amount - case when collect_now then extension_amount else 0 end,
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, current_status, format('Rental extended to %s. Charge: %s. %s', new_end_at::date, extension_amount, coalesce(reason, '')), auth.uid());
end;
$$;

grant execute on function public.admin_extend_booking(uuid, timestamptz, numeric, text, boolean, uuid, payment_channel, text, text) to authenticated;
