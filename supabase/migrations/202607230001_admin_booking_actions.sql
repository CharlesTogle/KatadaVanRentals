-- Admin booking action RPCs
-- Each function verifies is_admin(), validates status transitions, and runs transactionally.

-- Confirm booking
create or replace function public.admin_confirm_booking(
  target_booking_id uuid,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status in ('for_review', 'awaiting_documents', 'pending_price_approval')
  ) then
    raise exception 'Booking cannot be confirmed from current status';
  end if;

  update public.bookings set status = 'confirmed', updated_at = now() where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, null, 'confirmed', note, auth.uid());
end;
$$;

-- Reject booking
create or replace function public.admin_reject_booking(
  target_booking_id uuid,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status in ('for_review', 'awaiting_documents', 'pending_price_approval')
  ) then
    raise exception 'Booking cannot be rejected from current status';
  end if;

  update public.bookings set status = 'rejected', updated_at = now() where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, null, 'rejected', reason, auth.uid());
end;
$$;

-- Request documents
create or replace function public.admin_request_booking_documents(
  target_booking_id uuid,
  requested_documents text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status = 'for_review'
  ) then
    raise exception 'Booking cannot request documents from current status';
  end if;

  update public.bookings set status = 'awaiting_documents', updated_at = now() where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'for_review', 'awaiting_documents', requested_documents, auth.uid());
end;
$$;

-- Adjust booking price
create or replace function public.admin_adjust_booking_price(
  target_booking_id uuid,
  adjusted_total numeric,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status in ('for_review', 'awaiting_documents', 'pending_price_approval')
  ) then
    raise exception 'Booking price cannot be adjusted from current status';
  end if;

  update public.bookings
  set total_amount = adjusted_total,
      remaining_amount = adjusted_total - paid_amount,
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, null, null, format('Price adjusted to %s. Reason: %s', adjusted_total, reason), auth.uid());
end;
$$;

-- Start trip (release unit)
create or replace function public.admin_start_trip(
  target_booking_id uuid,
  collected_amount numeric,
  payment_method_id uuid default null,
  payment_channel payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_remaining numeric;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select remaining_amount into current_remaining
  from public.bookings where id = target_booking_id;

  if current_remaining is null then
    raise exception 'Booking not found';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status = 'confirmed'
  ) then
    raise exception 'Trip can only be started from confirmed status';
  end if;

  -- Insert payment if amount > 0
  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'verified', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  update public.bookings set status = 'on_trip', updated_at = now() where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'confirmed', 'on_trip', format('Trip started. Collected: %s', collected_amount), auth.uid());
end;
$$;

-- Extend rental
create or replace function public.admin_extend_booking(
  target_booking_id uuid,
  new_end_at timestamptz,
  extension_amount numeric,
  reason text default null,
  collect_now boolean default false,
  payment_method_id uuid default null,
  payment_channel payment_channel default null,
  reference_number text default null,
  receipt_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_end_at timestamptz;
  payment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select end_at into current_end_at
  from public.bookings where id = target_booking_id;

  if current_end_at is null then
    raise exception 'Booking not found';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status in ('confirmed', 'on_trip')
  ) then
    raise exception 'Booking cannot be extended from current status';
  end if;

  -- Insert payment if collecting now
  if collect_now and extension_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, coalesce(payment_channel, 'cash'), 'verified', extension_amount, reference_number, receipt_path, now(), auth.uid())
    returning id into payment_id;
  end if;

  -- Insert extension record
  insert into public.booking_extensions (booking_id, previous_end_at, new_end_at, extension_amount, reason, payment_id, created_by)
  values (target_booking_id, current_end_at, new_end_at, extension_amount, reason, payment_id, auth.uid());

  -- Update booking end date and total
  update public.bookings
  set end_at = new_end_at,
      total_amount = total_amount + extension_amount,
      remaining_amount = remaining_amount + extension_amount - case when collect_now then extension_amount else 0 end,
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, null, null, format('Rental extended to %s. Charge: %s. %s', new_end_at::date, extension_amount, coalesce(reason, '')), auth.uid());
end;
$$;

-- Complete booking (mark as returned)
create or replace function public.admin_complete_booking(
  target_booking_id uuid,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status = 'on_trip'
  ) then
    raise exception 'Booking can only be completed from on_trip status';
  end if;

  update public.bookings
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'on_trip', 'completed', note, auth.uid());
end;
$$;

-- Cancel booking
create or replace function public.admin_cancel_booking(
  target_booking_id uuid,
  cancellation_type text,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed')
  ) then
    raise exception 'Booking cannot be canceled from current status';
  end if;

  update public.bookings set status = 'canceled', canceled_at = now(), updated_at = now() where id = target_booking_id;

  insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by)
  values (target_booking_id, cancellation_type, reason, auth.uid());

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, null, 'canceled', format('Type: %s. Reason: %s', cancellation_type, reason), auth.uid());
end;
$$;

-- Delete booking
create or replace function public.admin_delete_booking(
  target_booking_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.bookings where id = target_booking_id;
end;
$$;

-- Grant execute to authenticated
grant execute on function public.admin_confirm_booking(uuid, text) to authenticated;
grant execute on function public.admin_reject_booking(uuid, text) to authenticated;
grant execute on function public.admin_request_booking_documents(uuid, text) to authenticated;
grant execute on function public.admin_adjust_booking_price(uuid, numeric, text) to authenticated;
grant execute on function public.admin_start_trip(uuid, numeric, uuid, payment_channel, text, text) to authenticated;
grant execute on function public.admin_extend_booking(uuid, timestamptz, numeric, text, boolean, uuid, payment_channel, text, text) to authenticated;
grant execute on function public.admin_complete_booking(uuid, text) to authenticated;
grant execute on function public.admin_cancel_booking(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_booking(uuid) to authenticated;
