drop function if exists public.create_booking cascade;

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
  p_self_drive_address jsonb default null,
  p_in_service_area boolean default true,
  p_flagged_for_manual_pricing boolean default false
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.bookings;
  v_customer_id uuid := auth.uid();
  v_end_at timestamptz;
  v_duration_days numeric;
  v_destination text;
  v_purpose_of_travel text;
  v_fuel_estimate_liters numeric;
  v_fuel_estimate_amount numeric;
  v_toll_estimate_amount numeric;
  v_toll_segments jsonb;
  v_toll_entry_plaza text;
  v_toll_entry_expressway text;
  v_toll_exit_plaza text;
  v_toll_exit_expressway text;
  v_toll_vehicle_class integer;
  v_toll_rfid_breakdown jsonb;
  v_self_drive_address jsonb;
begin
  if v_customer_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_booking_mode is null or p_booking_mode not in ('dropoff', 'keep') then
    raise exception 'Invalid booking mode';
  end if;

  if (p_rental_model = 'self_drive' or p_booking_mode = 'keep') and p_end_at is null then
    raise exception 'End date is required for this booking';
  end if;

  v_end_at := case
    when p_rental_model = 'self_drive' or p_booking_mode = 'keep' then p_end_at
    else null
  end;
  v_duration_days := case
    when p_booking_mode = 'dropoff' and p_rental_model in ('all_in', 'all_out') then 1
    else p_duration_days
  end;
  v_destination := case
    when p_rental_model = 'self_drive' or p_booking_mode = 'keep' then p_destination
    else null
  end;
  v_purpose_of_travel := case
    when p_rental_model = 'self_drive' or p_booking_mode = 'keep' then p_purpose_of_travel
    else null
  end;
  v_fuel_estimate_liters := case when p_rental_model = 'all_in' then p_fuel_estimate_liters else 0 end;
  v_fuel_estimate_amount := case when p_rental_model = 'all_in' then p_fuel_estimate_amount else 0 end;
  v_toll_estimate_amount := case when p_rental_model = 'all_in' then p_toll_estimate_amount else 0 end;
  v_toll_segments := case when p_rental_model = 'all_in' then coalesce(p_toll_segments, '[]'::jsonb) else '[]'::jsonb end;
  v_toll_entry_plaza := case when p_rental_model = 'all_in' then p_toll_entry_plaza else null end;
  v_toll_entry_expressway := case when p_rental_model = 'all_in' then p_toll_entry_expressway else null end;
  v_toll_exit_plaza := case when p_rental_model = 'all_in' then p_toll_exit_plaza else null end;
  v_toll_exit_expressway := case when p_rental_model = 'all_in' then p_toll_exit_expressway else null end;
  v_toll_vehicle_class := case when p_rental_model = 'all_in' then coalesce(p_toll_vehicle_class, 1) else 1 end;
  v_toll_rfid_breakdown := case when p_rental_model = 'all_in' then coalesce(p_toll_rfid_breakdown, '[]'::jsonb) else '[]'::jsonb end;
  v_self_drive_address := case when p_rental_model = 'self_drive' then p_self_drive_address else null end;

  if v_end_at is not null and p_start_at >= v_end_at then
    raise exception 'Invalid booking range: start must be before end.';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.bookings
    where idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  begin
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
      self_drive_address, in_service_area, flagged_for_manual_pricing,
      created_by, idempotency_key
    ) values (
      p_booking_number, v_customer_id, p_vehicle_id, p_rental_model, p_booking_mode,
      'for_review', p_start_at, v_end_at, v_duration_days,
      p_pickup_location, p_pickup_lat, p_pickup_lng,
      p_dropoff_location, p_dropoff_lat, p_dropoff_lng,
      v_destination, v_purpose_of_travel, p_notes,
      p_distance_km, p_duration_minutes,
      v_fuel_estimate_liters, v_fuel_estimate_amount,
      v_toll_estimate_amount, v_toll_segments,
      v_toll_entry_plaza, v_toll_entry_expressway,
      v_toll_exit_plaza, v_toll_exit_expressway,
      v_toll_vehicle_class, v_toll_rfid_breakdown,
      v_self_drive_address, p_in_service_area, p_flagged_for_manual_pricing,
      v_customer_id, p_idempotency_key
    )
    returning * into v_existing;
  exception when exclusion_violation then
    raise exception 'Vehicle is not available for these dates. It has a conflicting booking.';
  end;

  return v_existing;
end;
$$;

grant execute on function public.create_booking(
  text, uuid, public.rental_model, timestamptz, timestamptz, numeric,
  text, text, text, text, text, uuid,
  numeric, numeric, numeric, numeric,
  numeric, integer, numeric, numeric, numeric, jsonb,
  text, text, text, text, integer, jsonb, text, jsonb, boolean, boolean
) to authenticated;
