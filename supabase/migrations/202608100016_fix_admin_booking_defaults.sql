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
    if p_customer_id is null and nullif(p_booking->>'guest_email', '') is null then
      raise exception 'Customer or guest email is required';
    end if;

    insert into public.bookings (
      booking_number, customer_id, guest_name, guest_email, guest_mobile,
      vehicle_id, rental_model, booking_mode, status, start_at, end_at, duration_days,
      pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng,
      destination, purpose_of_travel, notes, distance_km, duration_minutes,
      fuel_estimate_liters, fuel_estimate_amount, toll_estimate_amount, toll_segments,
      toll_entry_plaza, toll_entry_expressway, toll_exit_plaza, toll_exit_expressway,
      toll_vehicle_class, toll_rfid_breakdown, self_drive_address, in_service_area,
      flagged_for_manual_pricing, actual_toll_amount, actual_fuel_amount, override_reasons,
      created_by, idempotency_key
    ) values (
      p_booking->>'booking_number', p_customer_id, nullif(p_booking->>'guest_name', ''),
      nullif(p_booking->>'guest_email', ''), nullif(p_booking->>'guest_mobile', ''),
      (p_booking->>'vehicle_id')::uuid, (p_booking->>'rental_model')::public.rental_model,
      coalesce(nullif(p_booking->>'booking_mode', ''), 'keep'), 'confirmed',
      (p_booking->>'start_at')::timestamptz, nullif(p_booking->>'end_at', '')::timestamptz,
      coalesce(nullif(p_booking->>'duration_days', '')::numeric, 1),
      nullif(p_booking->>'pickup_location', ''), nullif(p_booking->>'pickup_lat', '')::numeric,
      nullif(p_booking->>'pickup_lng', '')::numeric, nullif(p_booking->>'dropoff_location', ''),
      nullif(p_booking->>'dropoff_lat', '')::numeric, nullif(p_booking->>'dropoff_lng', '')::numeric,
      nullif(p_booking->>'destination', ''), nullif(p_booking->>'purpose_of_travel', ''),
      nullif(p_booking->>'notes', ''), nullif(p_booking->>'distance_km', '')::numeric,
      nullif(p_booking->>'duration_minutes', '')::integer,
      coalesce(nullif(p_booking->>'fuel_estimate_liters', '')::numeric, 0),
      coalesce(nullif(p_booking->>'fuel_estimate_amount', '')::numeric, 0),
      coalesce(nullif(p_booking->>'toll_estimate_amount', '')::numeric, 0),
      coalesce(p_booking->'toll_segments', '[]'::jsonb), nullif(p_booking->>'toll_entry_plaza', ''),
      nullif(p_booking->>'toll_entry_expressway', ''), nullif(p_booking->>'toll_exit_plaza', ''),
      nullif(p_booking->>'toll_exit_expressway', ''),
      coalesce(nullif(p_booking->>'toll_vehicle_class', '')::integer, 1),
      coalesce(p_booking->'toll_rfid_breakdown', '[]'::jsonb), p_booking->'self_drive_address',
      coalesce((p_booking->>'in_service_area')::boolean, true),
      coalesce((p_booking->>'flagged_for_manual_pricing')::boolean, false), 0, 0, '{}'::jsonb,
      p_actor_id, nullif(p_booking->>'idempotency_key', '')::uuid
    ) returning * into booking_record;
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

  select * into booking_record from public.bookings where id = booking_record.id;
  return booking_record;
end;
$$;

grant execute on function public.admin_create_booking_with_payment(jsonb, jsonb, uuid, uuid) to service_role;
