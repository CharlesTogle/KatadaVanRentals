-- Issue 1: Server-side price computation (audit#1)
-- BEFORE INSERT trigger recalculates all price fields from authoritative vehicle data
-- so client-submitted prices are always overridden with correct values

-- Issue 2: Idempotency key (audit#2)
-- Prevents duplicate booking creation on double-click / network retry

alter table public.bookings add column if not exists idempotency_key uuid unique;

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

  if new.rental_model = 'self_drive' then
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

drop trigger if exists recalculate_booking_prices on public.bookings;
create trigger recalculate_booking_prices
  before insert on public.bookings
  for each row execute function public.recalculate_booking_prices();

-- Idempotent booking creation: returns existing booking if idempotency_key matches
-- Uses auth.uid() internally so callers cannot impersonate other customers
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
  p_idempotency_key uuid default null
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
    booking_number, customer_id, vehicle_id, rental_model,
    status, start_at, end_at, duration_days,
    pickup_location, dropoff_location, destination,
    purpose_of_travel, notes, created_by, idempotency_key
  ) values (
    p_booking_number, v_customer_id, p_vehicle_id, p_rental_model,
    'for_review', p_start_at, p_end_at, p_duration_days,
    p_pickup_location, p_dropoff_location, p_destination,
    p_purpose_of_travel, p_notes, v_customer_id, p_idempotency_key
  )
  returning * into v_existing;

  return v_existing;
end;
$$;

grant execute on function public.create_booking(text, uuid, public.rental_model, timestamptz, timestamptz, numeric, text, text, text, text, text, uuid) to authenticated;
