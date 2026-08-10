drop function if exists public.admin_cancel_booking(uuid, text, text);

create function public.admin_cancel_booking(target_booking_id uuid, cancellation_type text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
  current_rental_model public.rental_model;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  select status, rental_model into current_status, current_rental_model
  from public.bookings where id = target_booking_id for update;

  if current_status is null or current_status not in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed') then
    raise exception 'Booking cannot be canceled from current status';
  end if;

  update public.bookings set status = 'canceled', canceled_at = now(), updated_at = now() where id = target_booking_id;
  insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by, refund_status)
  values (target_booking_id, cancellation_type, p_reason, auth.uid(),
    case when cancellation_type <> 'admin_no_refund'
      and current_status in ('for_review', 'awaiting_documents', 'pending_price_approval')
      and current_rental_model in ('all_in', 'all_out') then 'pending_refund'
      else 'refund_cancelled' end);
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, 'canceled', format('Type: %s. Reason: %s', cancellation_type, p_reason), auth.uid());
end;
$$;

grant execute on function public.admin_cancel_booking(uuid, text, text) to authenticated;
