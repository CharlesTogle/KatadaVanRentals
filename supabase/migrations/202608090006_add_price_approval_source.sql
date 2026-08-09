alter table public.bookings
  add column if not exists price_approval_source text
  check (price_approval_source in ('confirm_with_adjustment', 'manual_pricing'));

update public.bookings
set price_approval_source = case
  when in_service_area = false then 'manual_pricing'
  else 'confirm_with_adjustment'
end
where status = 'pending_price_approval'
  and price_approval_source is null;

create or replace function public.admin_adjust_booking_price(
  target_booking_id uuid,
  adjusted_total numeric,
  reason text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  previous_status public.booking_status;
  next_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if adjusted_total <= 0 then raise exception 'Adjusted total must be greater than zero'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status not in ('for_review', 'awaiting_documents', 'pending_price_approval') then
    raise exception 'Booking price cannot be adjusted from current status';
  end if;
  if booking_record.total_amount = adjusted_total then return booking_record; end if;

  previous_status := booking_record.status;
  next_status := case when adjusted_total > booking_record.total_amount then 'pending_price_approval' else 'confirmed' end;
  update public.bookings
  set total_amount = adjusted_total,
      subtotal_amount = adjusted_total,
      status = next_status,
      price_approval_source = case when next_status = 'pending_price_approval' then 'confirm_with_adjustment' else null end,
      updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);

   update public.booking_status_events
   set note = format('Price adjusted to %s. Reason: %s', adjusted_total, reason)
   where id = (
     select id from public.booking_status_events
     where booking_id = target_booking_id
       and from_status is not distinct from previous_status
       and to_status = next_status
     order by created_at desc limit 1
   );
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.admin_set_manual_price(
  target_booking_id uuid,
  price numeric,
  reason text default 'Manual pricing set'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  previous_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if price <= 0 then raise exception 'Manual price must be greater than zero'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status not in ('for_review', 'awaiting_documents') then
    raise exception 'Manual price can only be set on for_review or awaiting_documents bookings';
  end if;
  if booking_record.total_amount = price and not coalesce(booking_record.flagged_for_manual_pricing, false) then return booking_record; end if;

  previous_status := booking_record.status;
  update public.bookings
  set total_amount = price,
      subtotal_amount = price,
      flagged_for_manual_pricing = false,
      price_line_items = jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', 'Manual pricing', 'amount', price)),
      price_approval_source = 'manual_pricing',
      status = 'pending_price_approval',
      updated_at = now()
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);

   update public.booking_status_events
   set note = format('Manual price set to %s. Reason: %s', price, reason)
   where id = (
     select id from public.booking_status_events
     where booking_id = target_booking_id
       and from_status is not distinct from previous_status
       and to_status = 'pending_price_approval'
     order by created_at desc limit 1
   );
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

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

    insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by)
    values (target_booking_id, 'customer_request', 'Price adjustment approval deadline passed.', auth.uid());
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

grant execute on function public.admin_adjust_booking_price(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_manual_price(uuid, numeric, text) to authenticated;
grant execute on function public.accept_own_price_adjustment(uuid) to authenticated;
