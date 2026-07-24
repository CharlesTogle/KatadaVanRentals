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

  new.subtotal_amount := v_base_price * new.duration_days;

  if new.rental_model in ('all_in', 'all_out') then
    new.subtotal_amount := new.subtotal_amount + (v_driver_rate * new.duration_days);
  end if;

  new.total_amount := new.subtotal_amount + coalesce(new.delivery_fee, 0) + coalesce(new.recovery_fee, 0);

  if new.rental_model in ('self_drive', 'all_out') then
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
      'detail', new.duration_days || 'd × ₱' || v_base_price,
      'amount', v_base_price * new.duration_days
    )
  );

  if new.rental_model in ('all_in', 'all_out') then
    new.price_line_items := new.price_line_items || jsonb_build_object(
      'label', 'Driver',
      'detail', new.duration_days || 'd × ₱' || v_driver_rate,
      'amount', v_driver_rate * new.duration_days
    );
  end if;

  return new;
end;
$$;
