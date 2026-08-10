create or replace function public.cancel_own_booking(target_booking_id uuid, cancellation_type text, cancellation_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
  current_rental_model public.rental_model;
  current_price_approval_source text;
  cancellation_refund_status text;
begin
  select status, rental_model, price_approval_source
  into current_status, current_rental_model, current_price_approval_source
  from public.bookings
  where id = target_booking_id
    and customer_id = auth.uid()
    and status in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed')
    and (status <> 'pending_price_approval' or price_approval_source is not null);

  if current_status is null then
    raise exception 'Booking cannot be canceled by this customer';
  end if;

  cancellation_refund_status := case
    when current_status in ('for_review', 'awaiting_documents', 'pending_price_approval')
      and current_rental_model in ('all_in', 'all_out') then 'pending_refund'
    else 'refund_cancelled'
  end;

  update public.bookings
  set status = 'canceled', canceled_at = now(), updated_at = now()
  where id = target_booking_id;

  insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by, refund_status)
  values (target_booking_id, cancellation_type, cancellation_reason, auth.uid(), cancellation_refund_status);

  update public.booking_status_events
  set note = format('Type: %s. Reason: %s', cancellation_type, cancellation_reason)
  where id = (
    select id from public.booking_status_events
    where booking_id = target_booking_id
      and from_status = current_status
      and to_status = 'canceled'
    order by created_at desc limit 1
  );
end;
$$;

create or replace function public.admin_reject_booking(target_booking_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
  current_rental_model public.rental_model;
  next_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  select status, rental_model into current_status, current_rental_model
  from public.bookings where id = target_booking_id for update;

  if current_status is null or current_status not in ('for_review', 'awaiting_documents', 'pending_price_approval') then
    raise exception 'Booking cannot be rejected from current status';
  end if;

  next_status := case when current_status = 'pending_price_approval' then 'canceled' else 'rejected' end;
  update public.bookings
  set status = next_status, canceled_at = case when next_status = 'canceled' then now() else canceled_at end, updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, next_status, reason, auth.uid());

  if next_status = 'canceled' then
    insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by, refund_status)
    values (target_booking_id, 'admin_rejection', reason, auth.uid(),
      case when current_rental_model in ('all_in', 'all_out') then 'pending_refund' else 'refund_cancelled' end);
  end if;
end;
$$;

create or replace function public.admin_cancel_booking(target_booking_id uuid, cancellation_type text, reason text)
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
  values (target_booking_id, cancellation_type, reason, auth.uid(),
    case when cancellation_type <> 'admin_no_refund'
      and current_status in ('for_review', 'awaiting_documents', 'pending_price_approval')
      and current_rental_model in ('all_in', 'all_out') then 'pending_refund'
      else 'refund_cancelled' end);
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, 'canceled', format('Type: %s. Reason: %s', cancellation_type, reason), auth.uid());
end;
$$;

grant execute on function public.admin_reject_booking(uuid, text) to authenticated;
grant execute on function public.admin_cancel_booking(uuid, text, text) to authenticated;
