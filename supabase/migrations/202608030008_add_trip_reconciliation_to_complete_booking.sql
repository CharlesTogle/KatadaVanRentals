alter table public.bookings add column if not exists actual_toll_amount numeric(12,2) not null default 0 check (actual_toll_amount >= 0);
alter table public.bookings add column if not exists actual_fuel_amount numeric(12,2) not null default 0 check (actual_fuel_amount >= 0);

drop function if exists public.admin_complete_booking(uuid, numeric, uuid, payment_channel, text, text, text);

create or replace function public.admin_complete_booking(
  target_booking_id uuid,
  collected_amount numeric default 0,
  payment_method_id uuid default null,
  payment_channel payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null,
  actual_toll_amount numeric default null,
  actual_fuel_amount numeric default null,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  paid_total numeric := 0;
  reconciled_toll numeric := 0;
  reconciled_fuel numeric := 0;
  reconciliation_delta numeric := 0;
  next_total numeric := 0;
  event_note text := null;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select *
  into booking_record
  from public.bookings
  where id = target_booking_id and status = 'on_trip';

  if booking_record.id is null then
    raise exception 'Booking can only be completed from on_trip status';
  end if;

  if booking_record.rental_model = 'all_in' then
    if actual_toll_amount is null or actual_fuel_amount is null then
      raise exception 'Actual toll and gas are required for all-in bookings';
    end if;

    reconciled_toll := actual_toll_amount;
    reconciled_fuel := actual_fuel_amount;
  else
    reconciled_toll := coalesce(actual_toll_amount, booking_record.actual_toll_amount, 0);
    reconciled_fuel := coalesce(actual_fuel_amount, booking_record.actual_fuel_amount, 0);
  end if;

  reconciliation_delta := reconciled_toll + reconciled_fuel;
  next_total := booking_record.total_amount + reconciliation_delta;

  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'verified', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  select coalesce(sum(amount), 0)
  into paid_total
  from public.payments
  where booking_id = target_booking_id
    and status in ('verified', 'submitted');

  update public.bookings
  set status = 'completed',
      completed_at = now(),
      updated_at = now(),
      actual_toll_amount = reconciled_toll,
      actual_fuel_amount = reconciled_fuel,
      total_amount = next_total,
      paid_amount = paid_total,
      remaining_amount = greatest(next_total - paid_total, 0)
  where id = target_booking_id;

  if booking_record.rental_model = 'all_in' then
    event_note := format(
      'Trip reconciled. Actual toll: %s. Actual gas: %s. Added to total: %s',
      reconciled_toll,
      reconciled_fuel,
      reconciliation_delta
    );
  elsif note is not null then
    event_note := note;
  elsif collected_amount > 0 then
    event_note := format('Marked as returned. Collected: %s', collected_amount);
  end if;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'on_trip', 'completed', event_note, auth.uid());
end;
$$;

grant execute on function public.admin_complete_booking(uuid, numeric, uuid, payment_channel, text, text, numeric, numeric, text) to authenticated;
