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

  if tg_op = 'UPDATE' and old.flagged_for_manual_pricing and not new.flagged_for_manual_pricing then
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
