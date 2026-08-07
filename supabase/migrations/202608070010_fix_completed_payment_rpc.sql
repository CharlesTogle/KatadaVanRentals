drop function if exists public.admin_record_completed_booking_payment(
  uuid, numeric, uuid, public.payment_channel, text, text
);
drop function if exists public.admin_record_completed_booking_payment(
  uuid, numeric, uuid, public.payment_channel, text, text, uuid
);

create function public.admin_record_completed_booking_payment(
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
  if booking_record.status <> 'completed' then
    raise exception 'Payment can only be recorded for completed bookings';
  end if;
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

  insert into public.payments (
    booking_id,
    payment_method_id,
    channel,
    status,
    amount,
    reference_number,
    receipt_path,
    paid_at,
    submitted_by,
    idempotency_key
  )
  values (
    target_booking_id,
    payment_method_id,
    payment_channel,
    'submitted',
    collected_amount,
    p_reference_number,
    receipt_path,
    now(),
    auth.uid(),
    p_idempotency_key
  );

  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

grant execute on function public.admin_record_completed_booking_payment(
  uuid, numeric, uuid, public.payment_channel, text, text, uuid
) to authenticated;
