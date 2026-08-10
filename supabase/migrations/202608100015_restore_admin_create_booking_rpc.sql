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
    booking_record.override_reasons := coalesce(booking_record.override_reasons, '{}'::jsonb);
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

grant execute on function public.admin_create_booking_with_payment(jsonb, jsonb, uuid, uuid) to service_role;
