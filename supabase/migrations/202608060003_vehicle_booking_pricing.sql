alter table public.vehicles
  add column if not exists security_deposit_type text not null default 'fixed'
    check (security_deposit_type in ('fixed', 'percent'));

alter table public.vehicles drop column if exists discount;

alter table public.bookings
  add column if not exists overdue_fee_amount numeric(12,2) not null default 0 check (overdue_fee_amount >= 0),
  add column if not exists overdue_calculated_at timestamptz;

create or replace function public.calculate_overdue_charge(
  p_end_at timestamptz,
  p_status public.booking_status,
  p_base_price numeric,
  p_excess_rate numeric,
  p_full_day_after_hours integer,
  p_twelve_hour_rate numeric,
  p_as_of timestamptz default now()
) returns numeric
language plpgsql
immutable
as $$
declare
  overdue_hours integer;
  full_day_hours integer := greatest(coalesce(p_full_day_after_hours, 12), 1);
  full_days integer;
  remaining_hours integer;
begin
  if p_end_at is null or p_status in ('completed', 'canceled', 'rejected') or p_as_of <= p_end_at then
    return 0;
  end if;

  overdue_hours := ceil(extract(epoch from (p_as_of - p_end_at)) / 3600)::integer;
  full_days := overdue_hours / full_day_hours;
  remaining_hours := overdue_hours % full_day_hours;

  return (full_days * coalesce(p_base_price, 0)) + case
    when remaining_hours >= 12 and p_twelve_hour_rate is not null then p_twelve_hour_rate
    else remaining_hours * coalesce(p_excess_rate, 0)
  end;
end;
$$;

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
  base_amount numeric(12,2);
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

  if new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then
    base_total := coalesce(new.distance_km, 0) * vehicle_record.base_price_per_day;
  else
    base_total := vehicle_record.base_price_per_day * new.duration_days;
  end if;
  base_amount := base_total;

  if new.rental_model in ('all_in', 'all_out') and new.booking_mode = 'keep' then
    driver_total := vehicle_record.driver_rate_per_day * new.duration_days;
  end if;
  car_wash_total := greatest(vehicle_record.car_wash_fee, 0);

  if new.rental_model = 'self_drive' then
    vehicle_delivery_total := greatest(vehicle_record.delivery_fee, 0);
    new.delivery_fee := 0;
  else
    select coalesce(peso_per_km, 0) into reserve_percent from public.app_settings where id = true;
    new.delivery_fee := case when new.in_service_area and reserve_percent > 0 and coalesce(new.distance_km, 0) > 0
      then round(coalesce(new.distance_km, 0) * reserve_percent, 2) else 0 end;
  end if;

  if new.rental_model = 'all_in' then
    select coalesce(fuel_price_per_liter, 0) into fuel_price_per_liter from public.app_settings where id = true;
    new.fuel_estimate_liters := round(coalesce(new.distance_km, 0) / vehicle_record.km_per_liter, 2);
    new.fuel_estimate_amount := round(new.fuel_estimate_liters * fuel_price_per_liter, 2);
  else
    new.fuel_estimate_liters := 0;
    new.fuel_estimate_amount := 0;
  end if;

  if new.in_service_area and new.rental_model <> 'self_drive' and coalesce(new.distance_km, 0) > 0 then
    select coalesce(peso_per_km, 0) into reserve_percent from public.app_settings where id = true;
    new.recovery_fee := case when reserve_percent > 0 then round(coalesce(new.distance_km, 0) * reserve_percent, 2) else 0 end;
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

  new.price_line_items := jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) || 'km × ₱' || vehicle_record.base_price_per_day else new.duration_days || 'd × ₱' || vehicle_record.base_price_per_day end, 'amount', base_amount));
  if driver_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Driver', 'detail', new.duration_days || 'd × ₱' || vehicle_record.driver_rate_per_day, 'amount', driver_total); end if;
  if car_wash_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Car Wash', 'detail', 'Vehicle fee', 'amount', car_wash_total); end if;
  if vehicle_delivery_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Self-Drive Delivery', 'detail', 'Vehicle fee', 'amount', vehicle_delivery_total); end if;
  if security_deposit > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Security Deposit', 'detail', vehicle_record.security_deposit_type, 'amount', security_deposit); end if;
  if coalesce(new.overdue_fee_amount, 0) > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Overdue Charge', 'detail', 'Applied after end time', 'amount', new.overdue_fee_amount); end if;

  return new;
end;
$$;

create or replace function public.recalculate_booking_overdue_fee(target_booking_id uuid, as_of timestamptz default now())
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  vehicle_record public.vehicles%rowtype;
  next_overdue numeric(12,2);
begin
  select * into strict booking_record from public.bookings where id = target_booking_id;
  if not public.is_admin() and booking_record.customer_id is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  select * into strict vehicle_record from public.vehicles where id = booking_record.vehicle_id;
  next_overdue := public.calculate_overdue_charge(booking_record.end_at, booking_record.status, vehicle_record.base_price_per_day, vehicle_record.excess_rate_per_hour, vehicle_record.auto_full_day_after_hours, vehicle_record.twelve_hour_rate, as_of);

  update public.bookings
  set overdue_fee_amount = next_overdue, overdue_calculated_at = as_of, updated_at = now()
  where id = target_booking_id
  returning * into booking_record;
  return booking_record;
end;
$$;

grant execute on function public.recalculate_booking_overdue_fee(uuid, timestamptz) to authenticated;
