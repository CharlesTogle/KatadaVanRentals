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

create or replace function public.admin_set_manual_price(
  target_booking_id uuid,
  price numeric,
  reason text default 'Manual pricing set'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select status into current_status
  from public.bookings
  where id = target_booking_id;

  if current_status is null then
    raise exception 'Booking not found';
  end if;

  if current_status not in ('for_review', 'awaiting_documents') then
    raise exception 'Manual price can only be set on for_review or awaiting_documents bookings';
  end if;

  update public.bookings
  set total_amount = price,
      subtotal_amount = price,
      remaining_amount = price,
      deposit_amount = 0,
      delivery_fee = 0,
      recovery_fee = 0,
      fuel_estimate_amount = 0,
      fuel_estimate_liters = 0,
      toll_estimate_amount = 0,
      flagged_for_manual_pricing = false,
      price_line_items = jsonb_build_array(
        jsonb_build_object('label', 'Base', 'detail', 'Manual pricing', 'amount', price)
      ),
      status = 'pending_price_approval',
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, 'pending_price_approval', format('Manual price set to %s. Reason: %s', price, reason), auth.uid());
end;
$$;

grant execute on function public.admin_set_manual_price(uuid, numeric, text) to authenticated;
