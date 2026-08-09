create or replace function public.admin_process_booking_refund(
  target_booking_id uuid,
  p_refund_amount numeric,
  p_refund_method_id uuid,
  p_refund_channel public.payment_channel,
  p_refund_reference text,
  p_refund_receipt_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cancellation_id uuid;
  booking_deposit numeric;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_refund_amount is null or p_refund_amount <= 0 then raise exception 'Refund amount must be greater than zero'; end if;

  select deposit_amount into booking_deposit
  from public.bookings
  where id = target_booking_id
  for update;

  if p_refund_amount > coalesce(booking_deposit, 0) then
    raise exception 'Refund amount cannot exceed the security deposit';
  end if;

  select id into cancellation_id
  from public.booking_cancellations
  where booking_id = target_booking_id and refund_status = 'pending_refund'
  order by created_at desc
  limit 1
  for update;

  if cancellation_id is null then raise exception 'Booking has no pending refund'; end if;

  update public.payments
  set status = 'refunded', updated_at = now()
  where booking_id = target_booking_id and status in ('submitted', 'verified');

  update public.booking_cancellations
  set refund_status = 'refund_processed',
      refund_amount = p_refund_amount,
      refund_method_id = p_refund_method_id,
      refund_channel = p_refund_channel,
      refund_reference = p_refund_reference,
      refund_receipt_path = p_refund_receipt_path,
      refund_processed_at = now()
  where id = cancellation_id;
end;
$$;
