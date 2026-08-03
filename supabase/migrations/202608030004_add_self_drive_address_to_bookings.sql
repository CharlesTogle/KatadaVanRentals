alter table public.bookings add column if not exists self_drive_address jsonb;

drop function if exists public.create_booking(text, uuid, public.rental_model, timestamptz, timestamptz, numeric, text, text, text, text, text, uuid, numeric, numeric, numeric, numeric, numeric, integer, numeric, numeric, numeric, jsonb, text, text, text, text, integer, jsonb, text);

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
  p_booking_mode text default 'keep',
  p_self_drive_address jsonb default null
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
    self_drive_address, created_by, idempotency_key
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
    p_self_drive_address, v_customer_id, p_idempotency_key
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
  text, text, text, text, integer, jsonb, text, jsonb
) to authenticated;
