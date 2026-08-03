create or replace function public.admin_record_completed_booking_payment(
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
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if collected_amount <= 0 then
    raise exception 'Collected amount must be greater than 0';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status = 'completed'
  ) then
    raise exception 'Payment can only be recorded for completed bookings';
  end if;

  insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
  values (target_booking_id, payment_method_id, payment_channel, 'verified', collected_amount, reference_number, receipt_path, now(), auth.uid());

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'completed', 'completed', format('Payment recorded after completion. Collected: %s', collected_amount), auth.uid());
end;
$$;

grant execute on function public.admin_record_completed_booking_payment(uuid, numeric, uuid, payment_channel, text, text) to authenticated;
