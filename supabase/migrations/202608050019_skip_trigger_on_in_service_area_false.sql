create or replace function public.recalculate_booking_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_price numeric(12,2);
  v_driver_rate numeric(12,2);
  v_peso_per_km numeric(12,2);
  v_reserve_pct numeric(5,2);
  v_base_total numeric(12,2);
begin
  if new.flagged_for_manual_pricing then
    new.subtotal_amount := 0;
    new.total_amount := 0;
    new.deposit_amount := 0;
    new.remaining_amount := 0;
    new.delivery_fee := 0;
    new.recovery_fee := 0;
    new.fuel_estimate_amount := 0;
    new.fuel_estimate_liters := 0;
    new.toll_estimate_amount := 0;
    new.price_line_items := jsonb_build_array(
      jsonb_build_object('label', 'Manual Pricing', 'detail', 'Price subject to admin review', 'amount', 0)
    );
    return new;
  end if;

  if not coalesce(new.in_service_area, true) then
    return new;
  end if;

  select base_price_per_day, driver_rate_per_day
  into strict v_base_price, v_driver_rate
  from public.vehicles
  where id = new.vehicle_id;

  select coalesce(peso_per_km, 0) into v_peso_per_km
  from public.app_settings
  where id = true;

  if new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then
    v_base_total := coalesce(new.distance_km, 0) * v_base_price;
    new.subtotal_amount := v_base_total;
  else
    v_base_total := v_base_price * new.duration_days;
    new.subtotal_amount := v_base_total;
  end if;

  if new.rental_model in ('all_in', 'all_out') and new.booking_mode = 'keep' then
    new.subtotal_amount := new.subtotal_amount + (v_driver_rate * new.duration_days);
  end if;

  if new.in_service_area = true and v_peso_per_km > 0 and coalesce(new.distance_km, 0) > 0 then
    new.delivery_fee := coalesce(new.delivery_fee, round(coalesce(new.distance_km, 0) * v_peso_per_km, 2));
    new.recovery_fee := coalesce(new.recovery_fee, round(coalesce(new.distance_km, 0) * v_peso_per_km, 2));
  end if;

  new.total_amount := new.subtotal_amount + coalesce(new.delivery_fee, 0) + coalesce(new.recovery_fee, 0);

  if new.rental_model = 'all_in' and new.total_amount > 0 then
    select coalesce(reservation_percent, 10) / 100
    into v_reserve_pct
    from public.app_settings
    where id = true;
    new.deposit_amount := round(v_base_total * v_reserve_pct, 2);
  elsif new.total_amount > 0 then
    select coalesce(reservation_percent, 10) / 100
    into v_reserve_pct
    from public.app_settings
    where id = true;
    new.deposit_amount := round(new.total_amount * v_reserve_pct, 2);
  else
    new.deposit_amount := 0;
  end if;

  new.remaining_amount := new.total_amount - new.deposit_amount;

  new.price_line_items := jsonb_build_array(
    jsonb_build_object(
      'label', 'Base',
      'detail', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) || 'km × ₱' || v_base_price else new.duration_days || 'd × ₱' || v_base_price end,
      'amount', v_base_total
    )
  );

  if new.rental_model in ('all_in', 'all_out') and new.booking_mode = 'keep' then
    new.price_line_items := new.price_line_items || jsonb_build_object(
      'label', 'Driver',
      'detail', new.duration_days || 'd × ₱' || v_driver_rate,
      'amount', v_driver_rate * new.duration_days
    );
  end if;

  return new;
end;
$$;

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

grant execute on function public.accept_own_price_adjustment(uuid) to authenticated;
