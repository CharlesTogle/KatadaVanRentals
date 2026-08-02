alter table public.bookings add column if not exists toll_entry_plaza text;
alter table public.bookings add column if not exists toll_entry_expressway text;
alter table public.bookings add column if not exists toll_exit_plaza text;
alter table public.bookings add column if not exists toll_exit_expressway text;
alter table public.bookings add column if not exists toll_vehicle_class integer not null default 1 check (toll_vehicle_class in (1, 2, 3));
alter table public.bookings add column if not exists toll_rfid_breakdown jsonb not null default '[]';
alter table public.bookings add column if not exists booking_mode text not null default 'keep' check (booking_mode in ('dropoff', 'keep'));

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

  new.total_amount := new.subtotal_amount + coalesce(new.delivery_fee, 0) + coalesce(new.recovery_fee, 0);

  if new.total_amount > 0 then
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
      'amount', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) * v_base_price else v_base_price * new.duration_days end
    )
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
        'detail', 'Temporarily manual',
        'amount', coalesce(new.toll_estimate_amount, 0)
      );
  end if;

  return new;
end;
$$;

create or replace function public.create_booking(
  p_booking_number text,
  p_vehicle_id uuid,
  p_rental_model public.rental_model,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_duration_days numeric,
  p_pickup_location text default null,
  p_dropoff_location text default null,
  p_destination text default null,
  p_purpose_of_travel text default null,
  p_notes text default null,
  p_idempotency_key uuid default null,
  p_pickup_lat numeric default null,
  p_pickup_lng numeric default null,
  p_dropoff_lat numeric default null,
  p_dropoff_lng numeric default null,
  p_distance_km numeric default null,
  p_duration_minutes integer default null,
  p_fuel_estimate_liters numeric default 0,
  p_fuel_estimate_amount numeric default 0,
  p_toll_estimate_amount numeric default 0,
  p_toll_segments jsonb default '[]',
  p_toll_entry_plaza text default null,
  p_toll_entry_expressway text default null,
  p_toll_exit_plaza text default null,
  p_toll_exit_expressway text default null,
  p_toll_vehicle_class integer default 1,
  p_toll_rfid_breakdown jsonb default '[]',
  p_booking_mode text default 'keep'
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.bookings;
  v_customer_id uuid := auth.uid();
begin
  if v_customer_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.bookings
    where idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  insert into public.bookings (
    booking_number, customer_id, vehicle_id, rental_model, booking_mode,
    status, start_at, end_at, duration_days,
    pickup_location, pickup_lat, pickup_lng,
    dropoff_location, dropoff_lat, dropoff_lng,
    destination, purpose_of_travel, notes,
    distance_km, duration_minutes,
    fuel_estimate_liters, fuel_estimate_amount,
    toll_estimate_amount, toll_segments,
    toll_entry_plaza, toll_entry_expressway,
    toll_exit_plaza, toll_exit_expressway,
    toll_vehicle_class, toll_rfid_breakdown,
    created_by, idempotency_key
  ) values (
    p_booking_number, v_customer_id, p_vehicle_id, p_rental_model, p_booking_mode,
    'for_review', p_start_at, p_end_at, p_duration_days,
    p_pickup_location, p_pickup_lat, p_pickup_lng,
    p_dropoff_location, p_dropoff_lat, p_dropoff_lng,
    p_destination, p_purpose_of_travel, p_notes,
    p_distance_km, p_duration_minutes,
    p_fuel_estimate_liters, p_fuel_estimate_amount,
    p_toll_estimate_amount, p_toll_segments,
    p_toll_entry_plaza, p_toll_entry_expressway,
    p_toll_exit_plaza, p_toll_exit_expressway,
    p_toll_vehicle_class, p_toll_rfid_breakdown,
    v_customer_id, p_idempotency_key
  )
  returning * into v_existing;

  return v_existing;
end;
$$;

grant execute on function public.create_booking(
  text, uuid, public.rental_model, timestamptz, timestamptz, numeric,
  text, text, text, text, text, uuid,
  numeric, numeric, numeric, numeric,
  numeric, integer, numeric, numeric, numeric, jsonb,
  text, text, text, text, integer, jsonb, text
) to authenticated;
