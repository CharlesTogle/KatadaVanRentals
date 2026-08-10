-- Payment inserts happen inside booking creation. Refresh the parent row directly
-- so a stale lookup cannot abort the transaction with "Booking not found".
create or replace function public.refresh_booking_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and old.booking_id is distinct from new.booking_id then
    update public.bookings
    set paid_amount = coalesce((
          select sum(p.amount)
          from public.payments p
          where p.booking_id = old.booking_id and p.status = 'submitted'
        ), 0),
        remaining_amount = greatest(total_amount - coalesce((
          select sum(p.amount)
          from public.payments p
          where p.booking_id = old.booking_id and p.status = 'submitted'
        ), 0), 0),
        updated_at = now()
    where id = old.booking_id;
  end if;

  update public.bookings
  set paid_amount = coalesce((
        select sum(p.amount)
        from public.payments p
        where p.booking_id = new.booking_id and p.status = 'submitted'
      ), 0),
      remaining_amount = greatest(total_amount - coalesce((
        select sum(p.amount)
        from public.payments p
        where p.booking_id = new.booking_id and p.status = 'submitted'
      ), 0), 0),
      updated_at = now()
  where id = new.booking_id;

  return new;
end;
$$;
