drop function if exists public.admin_cancel_booking_refund(uuid, text);

create function public.admin_cancel_booking_refund(target_booking_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cancellation_id uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Refund cancellation reason is required'; end if;

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
      refund_cancel_reason = trim(p_reason)
  where id = cancellation_id;
end;
$$;

grant execute on function public.admin_cancel_booking_refund(uuid, text) to authenticated, service_role;
