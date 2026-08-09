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
    when current_status in ('for_review', 'awaiting_documents') and current_rental_model in ('all_in', 'all_out') then 'pending_refund'
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

grant execute on function public.cancel_own_booking(uuid, text, text) to authenticated, service_role;

create or replace function public.accept_own_price_adjustment(target_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  next_status public.booking_status;
  expiry_hours integer;
begin
  select * into booking_record from public.bookings
  where id = target_booking_id and customer_id = auth.uid() for update;
  if booking_record.id is null or booking_record.status <> 'pending_price_approval' or booking_record.price_approval_source is null then
    raise exception 'Price adjustment cannot be accepted by this customer';
  end if;

  select coalesce(booking_expiry_hours, 2)
    into expiry_hours
  from public.app_settings
  where id = true;
  expiry_hours := coalesce(expiry_hours, 2);

  if now() > booking_record.start_at - make_interval(hours => expiry_hours) then
    update public.bookings
    set status = 'canceled', canceled_at = now(), updated_at = now()
    where id = target_booking_id;

    insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by, refund_status)
    values (target_booking_id, 'customer_request', 'Price adjustment approval deadline passed.', auth.uid(), 'refund_cancelled');
     update public.booking_status_events
     set note = 'Price adjustment approval deadline passed.'
     where id = (
       select id from public.booking_status_events
       where booking_id = target_booking_id
         and from_status = 'pending_price_approval'
         and to_status = 'canceled'
       order by created_at desc limit 1
     );

    select * into booking_record from public.bookings where id = target_booking_id;
    return booking_record;
  end if;

  next_status := case
    when booking_record.price_approval_source = 'manual_pricing' then 'for_review'
    when coalesce(booking_record.in_service_area, true) then 'confirmed'
    else 'for_review'
  end;
  update public.bookings set status = next_status, updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
   update public.booking_status_events
   set note = 'Customer accepted price adjustment.'
   where id = (
     select id from public.booking_status_events
     where booking_id = target_booking_id
       and from_status = 'pending_price_approval'
       and to_status = next_status
     order by created_at desc limit 1
   );
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

grant execute on function public.accept_own_price_adjustment(uuid) to authenticated;
