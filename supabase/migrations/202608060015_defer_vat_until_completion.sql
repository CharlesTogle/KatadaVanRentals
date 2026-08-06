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
    base_total := coalesce(new.distance_km, 0) * vehicle_record.peso_per_km;
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

  if new.in_service_area and new.rental_model <> 'self_drive' and coalesce(new.distance_km, 0) > 0 then
    new.recovery_fee := case when vehicle_record.peso_per_km > 0 then round(coalesce(new.distance_km, 0) * vehicle_record.peso_per_km, 2) else 0 end;
  else
    new.recovery_fee := coalesce(new.recovery_fee, 0);
  end if;

  new.subtotal_amount := base_total + driver_total + car_wash_total + vehicle_delivery_total;
  new.discount_amount := coalesce(new.discount_amount, 0);
  new.total_amount := greatest(new.subtotal_amount - new.discount_amount, 0) + coalesce(new.delivery_fee, 0) + coalesce(new.recovery_fee, 0) + coalesce(new.overdue_fee_amount, 0);
  if vehicle_record.security_deposit_type = 'percent' then
    security_deposit := round(new.subtotal_amount * greatest(vehicle_record.security_deposit, 0) / 100, 2);
  else
    security_deposit := greatest(vehicle_record.security_deposit, 0);
  end if;
  new.deposit_amount := case when new.total_amount > 0 then security_deposit else 0 end;
  new.remaining_amount := greatest(new.total_amount - new.deposit_amount, 0);

  new.price_line_items := jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', case when new.booking_mode = 'dropoff' and new.rental_model in ('all_in', 'all_out') then coalesce(new.distance_km, 0) || 'km × ₱' || vehicle_record.peso_per_km else new.duration_days || 'd × ₱' || vehicle_record.base_price_per_day end, 'amount', base_amount));
  if driver_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Driver', 'detail', new.duration_days || 'd × ₱' || vehicle_record.driver_rate_per_day, 'amount', driver_total); end if;
  if car_wash_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Car Wash', 'detail', 'Vehicle fee', 'amount', car_wash_total); end if;
  if vehicle_delivery_total > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Self-Drive Delivery', 'detail', 'Vehicle fee', 'amount', vehicle_delivery_total); end if;
  if coalesce(new.overdue_fee_amount, 0) > 0 then new.price_line_items := new.price_line_items || jsonb_build_object('label', 'Overdue Charge', 'detail', 'Applied after end time', 'amount', new.overdue_fee_amount); end if;

  return new;
end;
$$;

create or replace function public.admin_set_manual_price(
  target_booking_id uuid,
  price numeric,
  reason text default 'Manual pricing set'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if price <= 0 then raise exception 'Manual price must be greater than zero'; end if;

  select status into current_status from public.bookings where id = target_booking_id;
  if current_status is null then raise exception 'Booking not found'; end if;
  if current_status not in ('for_review', 'awaiting_documents') then
    raise exception 'Manual price can only be set on for_review or awaiting_documents bookings';
  end if;

  update public.bookings
  set total_amount = price,
      subtotal_amount = price,
      remaining_amount = price,
      deposit_amount = 0,
      delivery_fee = 0,
      recovery_fee = 0,
      fuel_estimate_amount = 0,
      fuel_estimate_liters = 0,
      toll_estimate_amount = 0,
      flagged_for_manual_pricing = false,
      price_line_items = jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', 'Manual pricing (pre-VAT)', 'amount', price)),
      status = 'pending_price_approval',
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, 'pending_price_approval', format('Manual pre-VAT price set to %s. Reason: %s', price, reason), auth.uid());
end;
$$;

create or replace function public.admin_complete_booking(
  target_booking_id uuid,
  collected_amount numeric default 0,
  payment_method_id uuid default null,
  payment_channel payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null,
  actual_toll_amount numeric default null,
  actual_fuel_amount numeric default null,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  paid_total numeric := 0;
  reconciled_toll numeric := 0;
  reconciled_fuel numeric := 0;
  reconciliation_delta numeric := 0;
  existing_vat_amount numeric := 0;
  taxable_total numeric := 0;
  vat_percent numeric := 0;
  vat_amount numeric := 0;
  next_total numeric := 0;
  final_line_items jsonb := '[]'::jsonb;
  event_note text := null;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  select * into booking_record
  from public.bookings
  where id = target_booking_id and status = 'on_trip';
  if booking_record.id is null then raise exception 'Booking can only be completed from on_trip status'; end if;

  if booking_record.rental_model = 'all_in' then
    if actual_toll_amount is null or actual_fuel_amount is null then
      raise exception 'Actual toll and gas are required for all-in bookings';
    end if;
    reconciled_toll := actual_toll_amount;
    reconciled_fuel := actual_fuel_amount;
  else
    reconciled_toll := coalesce(actual_toll_amount, booking_record.actual_toll_amount, 0);
    reconciled_fuel := coalesce(actual_fuel_amount, booking_record.actual_fuel_amount, 0);
  end if;

  reconciliation_delta := reconciled_toll + reconciled_fuel;

  select coalesce(sum((item->>'amount')::numeric), 0)
  into existing_vat_amount
  from jsonb_array_elements(coalesce(booking_record.price_line_items, '[]'::jsonb)) item
  where item->>'label' ilike '%vat%';

  taxable_total := greatest(booking_record.total_amount - existing_vat_amount, 0) + reconciliation_delta;
  select coalesce(s.vat_percent, 0) into vat_percent from public.app_settings s where s.id = true;
  vat_amount := round(taxable_total * greatest(vat_percent, 0) / 100, 2);
  next_total := taxable_total + vat_amount;

  select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
  into final_line_items
  from jsonb_array_elements(coalesce(booking_record.price_line_items, '[]'::jsonb)) with ordinality as entries(item, ordinality)
  where item->>'label' not ilike '%vat%';
  if vat_amount > 0 then
    final_line_items := final_line_items || jsonb_build_array(jsonb_build_object('label', 'VAT', 'detail', vat_percent || '%', 'amount', vat_amount));
  end if;

  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'verified', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  select coalesce(sum(amount), 0) into paid_total
  from public.payments
  where booking_id = target_booking_id and status in ('verified', 'submitted');

  update public.bookings
  set status = 'completed',
      completed_at = now(),
      updated_at = now(),
      actual_toll_amount = reconciled_toll,
      actual_fuel_amount = reconciled_fuel,
      price_line_items = final_line_items,
      total_amount = next_total,
      paid_amount = paid_total,
      remaining_amount = greatest(next_total - paid_total, 0)
  where id = target_booking_id;

  if booking_record.rental_model = 'all_in' then
    event_note := format('Trip completed. Actual toll: %s. Actual gas: %s. Final VAT: %s.', reconciled_toll, reconciled_fuel, vat_amount);
  elsif note is not null then
    event_note := note;
  elsif collected_amount > 0 then
    event_note := format('Marked as returned. Collected: %s', collected_amount);
  end if;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'on_trip', 'completed', event_note, auth.uid());
end;
$$;

grant execute on function public.admin_set_manual_price(uuid, numeric, text) to authenticated;
grant execute on function public.admin_complete_booking(uuid, numeric, uuid, payment_channel, text, text, numeric, numeric, text) to authenticated;
