drop function if exists public.admin_complete_booking(uuid, text);

create or replace function public.admin_complete_booking(
  target_booking_id uuid,
  collected_amount numeric default 0,
  payment_method_id uuid default null,
  payment_channel payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null,
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

  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'verified', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  update public.bookings
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (
    target_booking_id,
    'on_trip',
    'completed',
    case
      when note is not null and collected_amount > 0 then format('Marked as returned. Collected: %s. %s', collected_amount, note)
      when note is not null then note
      when collected_amount > 0 then format('Marked as returned. Collected: %s', collected_amount)
      else null
    end,
    auth.uid()
  );
end;
$$;

grant execute on function public.admin_complete_booking(uuid, numeric, uuid, payment_channel, text, text, text) to authenticated;
