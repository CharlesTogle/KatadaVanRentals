-- Count 'submitted' payments (customer paid, receipt uploaded) alongside 'verified'
-- so paid_amount reflects deposit payments made through the customer booking form.
create or replace function public.refresh_booking_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_booking_id uuid;
begin
  if tg_op = 'DELETE' then
    target_booking_id = old.booking_id;
  else
    target_booking_id = new.booking_id;
  end if;

  update public.bookings b
  set paid_amount = coalesce((
        select sum(amount)
        from public.payments p
        where p.booking_id = target_booking_id
          and p.status in ('verified', 'submitted')
      ), 0),
      remaining_amount = greatest(total_amount - coalesce((
        select sum(amount)
        from public.payments p
        where p.booking_id = target_booking_id
          and p.status in ('verified', 'submitted')
      ), 0), 0),
      updated_at = now()
  where b.id = target_booking_id;

  return coalesce(new, old);
end;
$$;
