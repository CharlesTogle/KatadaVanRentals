create or replace function public.cancel_own_booking(target_booking_id uuid, cancellation_type text, cancellation_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set status = 'canceled',
      canceled_at = now(),
      updated_at = now()
  where id = target_booking_id
    and customer_id = auth.uid()
    and status in ('for_review', 'pending_price_approval', 'confirmed');

  if not found then
    raise exception 'Booking cannot be canceled by this customer';
  end if;

  insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by)
  values (target_booking_id, cancellation_type, cancellation_reason, auth.uid());
end;
$$;

grant execute on function public.cancel_own_booking(uuid, text, text) to authenticated, service_role;
