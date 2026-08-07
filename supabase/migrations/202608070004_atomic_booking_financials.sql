-- Canonical payment model: every accepted payment remains submitted.
-- Booking status is the admin verification boundary.

alter table public.payments
  add column if not exists idempotency_key uuid;

create unique index if not exists payments_booking_idempotency_key_idx
  on public.payments (booking_id, idempotency_key)
  where idempotency_key is not null;

update public.payments
set status = 'submitted'
where status = 'verified';

alter table public.payments
  drop constraint if exists payments_no_verified_status;

alter table public.payments
  add constraint payments_no_verified_status check (status <> 'verified');

drop function if exists public.admin_confirm_booking(uuid, text);
drop function if exists public.admin_adjust_booking_price(uuid, numeric, text);
drop function if exists public.admin_extend_booking(uuid, timestamptz, numeric, text, boolean, uuid, public.payment_channel, text, text);
drop function if exists public.admin_set_manual_price(uuid, numeric, text);
drop function if exists public.accept_own_price_adjustment(uuid);
drop function if exists public.admin_start_trip(uuid, numeric, uuid, public.payment_channel, text, text);
drop function if exists public.admin_record_completed_booking_payment(uuid, numeric, uuid, public.payment_channel, text, text);
drop function if exists public.admin_record_completed_booking_payment(uuid, numeric, uuid, public.payment_channel, text, text, uuid);
drop function if exists public.admin_complete_booking(uuid, numeric, uuid, public.payment_channel, text, text, numeric, numeric, text);

create or replace function public.recalculate_booking_financials(target_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  accepted_paid numeric(12,2);
begin
  select * into booking_record
  from public.bookings
  where id = target_booking_id
  for update;

  if booking_record.id is null then
    raise exception 'Booking not found';
  end if;

  select coalesce(sum(amount), 0)
  into accepted_paid
  from public.payments
  where booking_id = target_booking_id
    and status = 'submitted';

  update public.bookings
  set paid_amount = accepted_paid,
      remaining_amount = greatest(total_amount - accepted_paid, 0),
      updated_at = now()
  where id = target_booking_id
  returning * into booking_record;

  return booking_record;
end;
$$;

create or replace function public.refresh_booking_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' and old.booking_id is distinct from new.booking_id then
    perform public.recalculate_booking_financials(old.booking_id);
  end if;

  perform public.recalculate_booking_financials(
    case when tg_op = 'DELETE' then old.booking_id else new.booking_id end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_booking_paid_amount on public.payments;
create trigger refresh_booking_paid_amount
after insert or update of booking_id, status, amount or delete on public.payments
for each row execute function public.refresh_booking_paid_amount();

drop trigger if exists recalculate_booking_prices on public.bookings;
create trigger recalculate_booking_prices
before insert on public.bookings
for each row execute function public.recalculate_booking_prices();

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
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if not public.is_admin() and booking_record.customer_id is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  select * into vehicle_record from public.vehicles where id = booking_record.vehicle_id;
  next_overdue := public.calculate_overdue_charge(
    booking_record.end_at, booking_record.status, vehicle_record.base_price_per_day,
    vehicle_record.excess_rate_per_hour, vehicle_record.auto_full_day_after_hours,
    vehicle_record.twelve_hour_rate, as_of
  );

  update public.bookings
  set overdue_fee_amount = next_overdue,
      total_amount = greatest(total_amount - coalesce(overdue_fee_amount, 0) + next_overdue, 0),
      overdue_calculated_at = as_of,
      updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

drop policy if exists "payments insert own booking or admin" on public.payments;
create policy "payments insert admin only" on public.payments
for insert with check (public.is_admin());

create or replace function public.admin_confirm_booking(
  target_booking_id uuid,
  note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  previous_status public.booking_status;
  payment_count integer;
  submitted_total numeric(12,2);
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  select * into booking_record
  from public.bookings
  where id = target_booking_id
  for update;

  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status = 'confirmed' then return booking_record; end if;
  if booking_record.status not in ('for_review', 'awaiting_documents', 'pending_price_approval') then
    raise exception 'Booking cannot be confirmed from current status';
  end if;

  select count(*)::integer, coalesce(sum(amount), 0)
  into payment_count, submitted_total
  from public.payments
  where booking_id = target_booking_id and status = 'submitted';

  if not coalesce(booking_record.flagged_for_manual_pricing, false)
     and (payment_count <> 1 or submitted_total <> booking_record.deposit_amount) then
    raise exception 'A single submitted security deposit is required before confirmation';
  end if;

  previous_status := booking_record.status;
  update public.bookings
  set status = 'confirmed', updated_at = now()
  where id = target_booking_id
  returning * into booking_record;

  perform public.recalculate_booking_financials(target_booking_id);

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, previous_status, 'confirmed', note, auth.uid());

  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.admin_adjust_booking_price(
  target_booking_id uuid,
  adjusted_total numeric,
  reason text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  previous_status public.booking_status;
  next_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if adjusted_total <= 0 then raise exception 'Adjusted total must be greater than zero'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status not in ('for_review', 'awaiting_documents', 'pending_price_approval') then
    raise exception 'Booking price cannot be adjusted from current status';
  end if;
  if booking_record.total_amount = adjusted_total then return booking_record; end if;

  previous_status := booking_record.status;
  next_status := case when adjusted_total > booking_record.total_amount then 'pending_price_approval' else 'confirmed' end;
  update public.bookings
  set total_amount = adjusted_total,
      subtotal_amount = adjusted_total,
      status = next_status,
      updated_at = now()
  where id = target_booking_id
  returning * into booking_record;
  perform public.recalculate_booking_financials(target_booking_id);

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, previous_status, next_status, format('Price adjusted to %s. Reason: %s', adjusted_total, reason), auth.uid());
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.admin_extend_booking(
  target_booking_id uuid,
  p_new_end_at timestamptz,
  extension_amount numeric,
  reason text default null,
  collect_now boolean default false,
  payment_method_id uuid default null,
  payment_channel public.payment_channel default null,
  reference_number text default null,
  receipt_path text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  payment_id uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if extension_amount < 0 then raise exception 'Extension amount cannot be negative'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status not in ('confirmed', 'on_trip') then raise exception 'Booking cannot be extended from current status'; end if;
  if p_new_end_at <= coalesce(booking_record.end_at, now()) then raise exception 'Extension must be after the current end'; end if;
  if exists (select 1 from public.booking_extensions where booking_id = target_booking_id and booking_extensions.new_end_at = p_new_end_at) then
    return booking_record;
  end if;
  if collect_now and extension_amount > booking_record.remaining_amount then
    raise exception 'Extension payment exceeds the outstanding balance';
  end if;

  if collect_now and extension_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, coalesce(payment_channel, 'cash'), 'submitted', extension_amount, reference_number, receipt_path, now(), auth.uid())
    returning id into payment_id;
  end if;

  insert into public.booking_extensions (booking_id, previous_end_at, new_end_at, extension_amount, reason, payment_id, created_by)
  values (target_booking_id, booking_record.end_at, p_new_end_at, extension_amount, reason, payment_id, auth.uid());

  update public.bookings
  set end_at = p_new_end_at, total_amount = total_amount + extension_amount, updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.admin_set_manual_price(
  target_booking_id uuid,
  price numeric,
  reason text default 'Manual pricing set'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  previous_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if price <= 0 then raise exception 'Manual price must be greater than zero'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status not in ('for_review', 'awaiting_documents') then
    raise exception 'Manual price can only be set on for_review or awaiting_documents bookings';
  end if;
  if booking_record.total_amount = price and not coalesce(booking_record.flagged_for_manual_pricing, false) then return booking_record; end if;
  previous_status := booking_record.status;
  update public.bookings
  set total_amount = price, subtotal_amount = price, flagged_for_manual_pricing = false,
      price_line_items = jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', 'Manual pricing', 'amount', price)),
      status = 'pending_price_approval', updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, previous_status, 'pending_price_approval', format('Manual price set to %s. Reason: %s', price, reason), auth.uid());
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.accept_own_price_adjustment(target_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  next_status public.booking_status;
begin
  select * into booking_record from public.bookings
  where id = target_booking_id and customer_id = auth.uid() for update;
  if booking_record.id is null then
    raise exception 'Price adjustment cannot be accepted by this customer';
  end if;
  if booking_record.status = 'confirmed' then return booking_record; end if;
  if booking_record.status <> 'pending_price_approval' then raise exception 'Price adjustment cannot be accepted by this customer'; end if;
  next_status := case when coalesce(booking_record.in_service_area, true) then 'confirmed' else 'for_review' end;
  update public.bookings set status = next_status, updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'pending_price_approval', next_status, 'Customer accepted price adjustment.', auth.uid());
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.create_booking_with_payment(
  p_booking_number text,
  p_vehicle_id uuid,
  p_rental_model public.rental_model,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_duration_days numeric,
  p_payment_method_id uuid,
  p_payment_channel public.payment_channel,
  p_payment_reference text,
  p_payment_receipt_path text,
  p_payment_idempotency_key uuid,
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
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  existing_payment public.payments%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_payment_idempotency_key is null then raise exception 'Payment idempotency key is required'; end if;

  select * into booking_record
  from public.create_booking(
    p_booking_number, p_vehicle_id, p_rental_model, p_start_at, p_end_at,
    p_duration_days, p_pickup_location, p_dropoff_location, p_destination,
    p_purpose_of_travel, p_notes, p_idempotency_key, p_pickup_lat, p_pickup_lng,
    p_dropoff_lat, p_dropoff_lng, p_distance_km, p_duration_minutes,
    p_fuel_estimate_liters, p_fuel_estimate_amount, p_toll_estimate_amount,
    p_toll_segments, p_toll_entry_plaza, p_toll_entry_expressway,
    p_toll_exit_plaza, p_toll_exit_expressway, p_toll_vehicle_class,
    p_toll_rfid_breakdown, p_booking_mode, p_self_drive_address,
    p_in_service_area, p_flagged_for_manual_pricing
  );

  if booking_record.customer_id <> auth.uid() then raise exception 'Booking does not belong to customer'; end if;

  select * into existing_payment
  from public.payments
  where booking_id = booking_record.id and idempotency_key = p_payment_idempotency_key;
  if existing_payment.id is not null then return booking_record; end if;

  if exists (select 1 from public.payments where booking_id = booking_record.id and status = 'submitted') then
    return booking_record;
  end if;

  if not booking_record.flagged_for_manual_pricing then
    if p_payment_method_id is null or p_payment_reference is null or trim(p_payment_reference) = '' then
      raise exception 'Payment method and reference are required';
    end if;
    if booking_record.deposit_amount <= 0 then raise exception 'Security deposit must be greater than zero'; end if;
    insert into public.payments (
      booking_id, payment_method_id, channel, status, amount, reference_number,
      receipt_path, paid_at, submitted_by, idempotency_key
    ) values (
      booking_record.id, p_payment_method_id, p_payment_channel, 'submitted',
      booking_record.deposit_amount, trim(p_payment_reference),
      p_payment_receipt_path, now(), auth.uid(), p_payment_idempotency_key
    );
  end if;

  perform public.recalculate_booking_financials(booking_record.id);
  select * into booking_record from public.bookings where id = booking_record.id;
  return booking_record;
end;
$$;

create or replace function public.admin_create_booking_with_payment(
  p_booking jsonb,
  p_payment jsonb,
  p_customer_id uuid default null,
  p_actor_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  existing_payment public.payments%rowtype;
  payment_key uuid;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_actor_id is null then raise exception 'Actor is required'; end if;
  if p_customer_id is null then raise exception 'Customer is required'; end if;
  payment_key := nullif(p_payment->>'idempotency_key', '')::uuid;

  select * into booking_record
  from public.bookings
  where idempotency_key = nullif(p_booking->>'idempotency_key', '')::uuid
    and (customer_id = p_customer_id or (p_customer_id is null and customer_id is null));

  if booking_record.id is null then
    booking_record := jsonb_populate_record(null::public.bookings, p_booking);
    booking_record.id := gen_random_uuid();
    booking_record.customer_id := p_customer_id;
    booking_record.created_by := p_actor_id;
    booking_record.status := 'confirmed';
    booking_record.paid_amount := 0;
    booking_record.remaining_amount := 0;
    booking_record.created_at := now();
    booking_record.updated_at := now();

    if booking_record.customer_id is null and nullif(booking_record.guest_email, '') is null then
      raise exception 'Customer or guest email is required';
    end if;

    insert into public.bookings values (booking_record.*);
    select * into booking_record from public.bookings where id = booking_record.id;
  end if;

  if not coalesce(booking_record.flagged_for_manual_pricing, false) then
    if payment_key is null then raise exception 'Payment idempotency key is required'; end if;
    select * into existing_payment
    from public.payments
    where booking_id = booking_record.id and idempotency_key = payment_key;
    if existing_payment.id is null then
      if exists (select 1 from public.payments where booking_id = booking_record.id and status = 'submitted') then
        return booking_record;
      end if;
      if nullif(p_payment->>'payment_method_id', '') is null or nullif(trim(p_payment->>'reference_number'), '') is null then
        raise exception 'Payment method and reference are required';
      end if;
      insert into public.payments (
        booking_id, payment_method_id, channel, status, amount, reference_number,
        receipt_path, paid_at, submitted_by, idempotency_key
      ) values (
        booking_record.id,
        (p_payment->>'payment_method_id')::uuid,
        (p_payment->>'channel')::public.payment_channel,
        'submitted',
        booking_record.deposit_amount,
        trim(p_payment->>'reference_number'),
        nullif(p_payment->>'receipt_path', ''),
        now(),
        p_actor_id,
        payment_key
      );
    end if;
  end if;

  perform public.recalculate_booking_financials(booking_record.id);
  select * into booking_record from public.bookings where id = booking_record.id;
  return booking_record;
end;
$$;

create or replace function public.admin_start_trip(
  target_booking_id uuid,
  collected_amount numeric,
  payment_method_id uuid default null,
  payment_channel public.payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status = 'on_trip' then return booking_record; end if;
  if booking_record.status <> 'confirmed' then raise exception 'Trip can only be started from confirmed status'; end if;
  if collected_amount < 0 or collected_amount > booking_record.remaining_amount then
    raise exception 'Collected amount exceeds the outstanding balance';
  end if;

  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'submitted', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  update public.bookings set status = 'on_trip', updated_at = now()
  where id = target_booking_id returning * into booking_record;
  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'confirmed', 'on_trip', format('Trip started. Submitted: %s', collected_amount), auth.uid());
  return booking_record;
end;
$$;

create or replace function public.admin_record_completed_booking_payment(
  target_booking_id uuid,
  collected_amount numeric,
  payment_method_id uuid default null,
  payment_channel public.payment_channel default 'cash',
  p_reference_number text default null,
  receipt_path text default null,
  p_idempotency_key uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.status <> 'completed' then raise exception 'Payment can only be recorded for completed bookings'; end if;
  if collected_amount <= 0 or collected_amount > booking_record.remaining_amount then
    raise exception 'Collected amount exceeds the outstanding balance';
  end if;
  if p_idempotency_key is not null and exists (
    select 1 from public.payments
    where booking_id = target_booking_id and idempotency_key = p_idempotency_key
  ) then
    return booking_record;
  end if;
  if p_idempotency_key is null and p_reference_number is not null and exists (
    select 1 from public.payments
    where booking_id = target_booking_id
      and status = 'submitted'
      and amount = collected_amount
      and payments.reference_number = p_reference_number
  ) then
    return booking_record;
  end if;

  insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by, idempotency_key)
  values (target_booking_id, payment_method_id, payment_channel, 'submitted', collected_amount, p_reference_number, receipt_path, now(), auth.uid(), p_idempotency_key)
  perform public.recalculate_booking_financials(target_booking_id);

  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.admin_complete_booking(
  target_booking_id uuid,
  collected_amount numeric default 0,
  payment_method_id uuid default null,
  payment_channel public.payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null,
  actual_toll_amount numeric default null,
  actual_fuel_amount numeric default null,
  note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  reconciliation_delta numeric(12,2) := 0;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status = 'completed' then return booking_record; end if;
  if booking_record.status <> 'on_trip' then raise exception 'Booking can only be completed from on_trip status'; end if;

  if booking_record.rental_model = 'all_in' then
    if actual_toll_amount is null or actual_fuel_amount is null then
      raise exception 'Actual toll and fuel are required for all-in bookings';
    end if;
    reconciliation_delta := actual_toll_amount + actual_fuel_amount;
  end if;

  if collected_amount < 0 or collected_amount > booking_record.remaining_amount + reconciliation_delta then
    raise exception 'Collected amount exceeds the outstanding balance';
  end if;

  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'submitted', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  update public.bookings
  set status = 'completed', completed_at = now(), updated_at = now(),
      actual_toll_amount = coalesce(actual_toll_amount, booking_record.actual_toll_amount, 0),
      actual_fuel_amount = coalesce(actual_fuel_amount, booking_record.actual_fuel_amount, 0),
      total_amount = total_amount + reconciliation_delta
  where id = target_booking_id
  returning * into booking_record;

  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.get_revenue_report(
  from_date timestamptz default null,
  to_date timestamptz default null
)
returns table (
  id uuid, booking_id uuid, channel public.payment_channel, status public.payment_status,
  amount numeric, reference_number text, verified_at timestamptz, paid_at timestamptz,
  created_at timestamptz, booking_number text, customer_id uuid,
  customer_first_name text, customer_last_name text, customer_email text,
  vehicle_id uuid, vehicle_name text, vehicle_plate text, payment_method_provider text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query
  select p.id, p.booking_id, p.channel, p.status, p.amount, p.reference_number,
    p.verified_at, p.paid_at, p.created_at, b.booking_number, b.customer_id,
    pr.first_name, pr.last_name, pr.email, b.vehicle_id, v.name, v.plate_number, pm.provider
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  left join public.profiles pr on pr.id = b.customer_id
  join public.vehicles v on v.id = b.vehicle_id
  left join public.payment_methods pm on pm.id = p.payment_method_id
  where p.status = 'submitted'
    and b.status in ('confirmed', 'on_trip', 'completed')
    and (from_date is null or p.paid_at >= from_date)
    and (to_date is null or p.paid_at <= to_date)
  order by p.paid_at desc;
end;
$$;

grant execute on function public.recalculate_booking_financials(uuid) to authenticated;
grant execute on function public.create_booking_with_payment(text, uuid, public.rental_model, timestamptz, timestamptz, numeric, uuid, public.payment_channel, text, text, uuid, text, text, text, text, text, uuid, numeric, numeric, numeric, numeric, numeric, integer, numeric, numeric, numeric, jsonb, text, text, text, text, integer, jsonb, text, jsonb, boolean, boolean) to authenticated;
grant execute on function public.admin_create_booking_with_payment(jsonb, jsonb, uuid, uuid) to service_role;
grant execute on function public.admin_confirm_booking(uuid, text) to authenticated;
grant execute on function public.admin_adjust_booking_price(uuid, numeric, text) to authenticated;
grant execute on function public.admin_extend_booking(uuid, timestamptz, numeric, text, boolean, uuid, public.payment_channel, text, text) to authenticated;
grant execute on function public.admin_set_manual_price(uuid, numeric, text) to authenticated;
grant execute on function public.accept_own_price_adjustment(uuid) to authenticated;
grant execute on function public.admin_start_trip(uuid, numeric, uuid, public.payment_channel, text, text) to authenticated;
grant execute on function public.admin_record_completed_booking_payment(uuid, numeric, uuid, public.payment_channel, text, text, uuid) to authenticated;
grant execute on function public.admin_complete_booking(uuid, numeric, uuid, public.payment_channel, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.get_revenue_report(timestamptz, timestamptz) to authenticated;

do $$
declare
  booking_id uuid;
begin
  for booking_id in select id from public.bookings loop
    perform public.recalculate_booking_financials(booking_id);
  end loop;
end;
$$;
