create or replace function public.recalculate_booking_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_price numeric(12,2);
  v_driver_rate numeric(12,2);
  v_reserve_pct numeric(5,2);
begin
  select base_price_per_day, driver_rate_per_day
  into strict v_base_price, v_driver_rate
  from public.vehicles
  where id = new.vehicle_id;

  if new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then
    new.subtotal_amount := coalesce(new.distance_km, 0) * v_base_price;
  else
    new.subtotal_amount := v_base_price * new.duration_days;
  end if;

  if new.rental_model in ('all_in', 'all_out') and new.booking_mode = 'keep' then
    new.subtotal_amount := new.subtotal_amount + (v_driver_rate * new.duration_days);
  end if;

  if new.rental_model = 'all_in' then
    new.subtotal_amount := new.subtotal_amount + coalesce(new.fuel_estimate_amount, 0) + coalesce(new.toll_estimate_amount, 0);
  end if;

  new.subtotal_amount := greatest(new.subtotal_amount - coalesce(new.discount_amount, 0), 0);
  new.total_amount := new.subtotal_amount + coalesce(new.delivery_fee, 0) + coalesce(new.recovery_fee, 0);

  select reserve_payment_pct into v_reserve_pct
  from public.app_settings
  order by created_at desc
  limit 1;

  if new.rental_model = 'self_drive' then
    new.deposit_amount := round(new.total_amount * coalesce(v_reserve_pct, 10) / 100.0, 2);
  else
    new.deposit_amount := 0;
  end if;

  new.remaining_amount := new.total_amount - new.deposit_amount;

  new.price_line_items := '[]'::jsonb || jsonb_build_object(
    'label', 'Base',
    'detail', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) || 'km × ₱' || v_base_price else new.duration_days || 'd × ₱' || v_base_price end,
    'amount', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) * v_base_price else v_base_price * new.duration_days end
  );

  if new.rental_model in ('all_in', 'all_out') and new.booking_mode = 'keep' then
    new.price_line_items := new.price_line_items || jsonb_build_object(
      'label', 'Driver',
      'detail', new.duration_days || 'd × ₱' || v_driver_rate,
      'amount', v_driver_rate * new.duration_days
    );
  end if;

  if new.rental_model = 'all_in' then
    new.price_line_items := new.price_line_items
      || jsonb_build_object(
        'label', 'Fuel Estimate',
        'detail', coalesce(new.distance_km, 0) || ' km',
        'amount', coalesce(new.fuel_estimate_amount, 0)
      )
      || jsonb_build_object(
        'label', 'Toll Estimate',
        'detail', 'Route-based estimate',
        'amount', coalesce(new.toll_estimate_amount, 0)
      );
  end if;

  return new;
end;
$$;
