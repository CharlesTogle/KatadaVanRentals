alter table public.vehicles
  add column if not exists peso_per_km numeric(10,2) not null default 0
    check (peso_per_km >= 0);

update public.vehicles
set peso_per_km = coalesce((select peso_per_km from public.app_settings where id = true), 0)
where peso_per_km = 0;

alter table public.app_settings drop column if exists peso_per_km;

create or replace function public.recalculate_booking_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vehicle_record public.vehicles%rowtype;
  base_total numeric(12,2);
  driver_total numeric(12,2) := 0;
  car_wash_total numeric(12,2) := 0;
  vehicle_delivery_total numeric(12,2) := 0;
  security_deposit numeric(12,2) := 0;
  reserve_percent numeric(5,2);
  fuel_price_per_liter numeric(10,2);
begin
  select * into strict vehicle_record from public.vehicles where id = new.vehicle_id;

  if new.rental_model = 'all_in' and (vehicle_record.km_per_liter is null or vehicle_record.km_per_liter <= 0) then
    raise exception 'Vehicle fuel efficiency is not configured';
  end if;

  if new.flagged_for_manual_pricing then
    new.subtotal_amount := 0;
    new.total_amount := 0;
    new.deposit_amount := 0;
    new.remaining_amount := 0;
    new.delivery_fee := 0;
    new.recovery_fee := 0;
    new.overdue_fee_amount := 0;
    new.fuel_estimate_amount := 0;
    new.fuel_estimate_liters := 0;
    new.toll_estimate_amount := 0;
    new.price_line_items := jsonb_build_array(jsonb_build_object('label', 'Manual Pricing', 'detail', 'Price subject to admin review', 'amount', 0));
    return new;
  end if;

  if not coalesce(new.in_service_area, true) then return new; end if;

  if new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then
    base_total := coalesce(new.distance_km, 0) * vehicle_record.base_price_per_day;
  else
    base_total := vehicle_record.base_price_per_day * new.duration_days;
  end if;

  if new.rental_model in ('all_in', 'all_out') and new.booking_mode = 'keep' then
    driver_total := vehicle_record.driver_rate_per_day * new.duration_days;
  end if;
  car_wash_total := greatest(vehicle_record.car_wash_fee, 0);

  if new.rental_model = 'self_drive' then
    vehicle_delivery_total := greatest(vehicle_record.delivery_fee, 0);
    new.delivery_fee := 0;
  else
    new.delivery_fee := case when vehicle_record.peso_per_km > 0 and coalesce(new.distance_km, 0) > 0
      then round(coalesce(new.distance_km, 0) * vehicle_record.peso_per_km, 2) else 0 end;
  end if;

  if new.rental_model = 'all_in' then
    select coalesce(s.fuel_price_per_liter, 0) into fuel_price_per_liter from public.app_settings s where s.id = true;
    new.fuel_estimate_liters := round(coalesce(new.distance_km, 0) / vehicle_record.km_per_liter, 2);
    new.fuel_estimate_amount := round(new.fuel_estimate_liters * fuel_price_per_liter, 2);
  else
    new.fuel_estimate_liters := 0;
    new.fuel_estimate_amount := 0;
  end if;

  if new.rental_model <> 'self_drive' and coalesce(new.distance_km, 0) > 0 then
    new.recovery_fee := case when vehicle_record.peso_per_km > 0
      then round(coalesce(new.distance_km, 0) * vehicle_record.peso_per_km, 2) else 0 end;
  else
    new.recovery_fee := coalesce(new.recovery_fee, 0);
  end if;

  if vehicle_record.security_deposit_type = 'percent' then
    security_deposit := round((base_total + driver_total + car_wash_total + vehicle_delivery_total) * greatest(vehicle_record.security_deposit, 0) / 100, 2);
  else
    security_deposit := greatest(vehicle_record.security_deposit, 0);
  end if;

  new.subtotal_amount := base_total + driver_total + car_wash_total + vehicle_delivery_total;
  new.discount_amount := coalesce(new.discount_amount, 0);
  new.total_amount := greatest(new.subtotal_amount - new.discount_amount, 0) + coalesce(new.delivery_fee, 0) + coalesce(new.recovery_fee, 0) + security_deposit + coalesce(new.overdue_fee_amount, 0);
  new.deposit_amount := case when new.total_amount > 0 then security_deposit else 0 end;
  new.remaining_amount := greatest(new.total_amount - new.deposit_amount, 0);

  new.price_line_items := jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) || 'km × ₱' || vehicle_record.base_price_per_day else new.duration_days || 'd × ₱' || vehicle_record.base_price_per_day end, 'amount', base_total));
  if driver_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Driver', 'detail', new.duration_days || 'd × ₱' || vehicle_record.driver_rate_per_day, 'amount', driver_total); end if;
  if car_wash_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Car Wash', 'detail', 'Vehicle fee', 'amount', car_wash_total); end if;
  if vehicle_delivery_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Self-Drive Delivery', 'detail', 'Vehicle fee', 'amount', vehicle_delivery_total); end if;
  if security_deposit > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Security Deposit', 'detail', vehicle_record.security_deposit_type, 'amount', security_deposit); end if;
  if coalesce(new.overdue_fee_amount, 0) > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Overdue Charge', 'detail', 'Applied after end time', 'amount', new.overdue_fee_amount); end if;
  return new;
end;
$$;
