alter table public.booking_cancellations
  add column if not exists refund_amount numeric(12,2) check (refund_amount is null or refund_amount > 0),
  add column if not exists refund_method_id uuid references public.payment_methods(id) on delete set null,
  add column if not exists refund_channel public.payment_channel,
  add column if not exists refund_reference text,
  add column if not exists refund_receipt_path text,
  add column if not exists refund_processed_at timestamptz,
  add column if not exists refund_canceled_at timestamptz,
  add column if not exists refund_cancel_reason text;

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
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_refund_amount <= 0 then raise exception 'Refund amount must be greater than zero'; end if;

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

create or replace function public.admin_cancel_booking_refund(target_booking_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cancellation_id uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if nullif(trim(reason), '') is null then raise exception 'Refund cancellation reason is required'; end if;

  select id into cancellation_id
  from public.booking_cancellations
  where booking_id = target_booking_id and refund_status = 'pending_refund'
  order by created_at desc
  limit 1
  for update;

  if cancellation_id is null then raise exception 'Booking has no pending refund'; end if;

  update public.booking_cancellations
  set refund_status = 'refund_cancelled',
      refund_canceled_at = now(),
      refund_cancel_reason = trim(reason)
  where id = cancellation_id;
end;
$$;

grant execute on function public.admin_process_booking_refund(uuid, numeric, uuid, public.payment_channel, text, text) to authenticated, service_role;
grant execute on function public.admin_cancel_booking_refund(uuid, text) to authenticated, service_role;
