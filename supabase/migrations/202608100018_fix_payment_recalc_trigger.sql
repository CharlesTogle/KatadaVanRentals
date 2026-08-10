create or replace function public.refresh_booking_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_booking_id uuid;
begin
  if tg_op <> 'INSERT' and old.booking_id is distinct from new.booking_id then
    target_booking_id := old.booking_id;
    update public.bookings
    set paid_amount = coalesce((
          select sum(p.amount) from public.payments p
          where p.booking_id = target_booking_id and p.status = 'submitted'
        ), 0),
        remaining_amount = greatest(total_amount - coalesce((
          select sum(p.amount) from public.payments p
          where p.booking_id = target_booking_id and p.status = 'submitted'
        ), 0), 0),
        updated_at = now()
    where id = target_booking_id;
  end if;

  target_booking_id := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;
  update public.bookings
  set paid_amount = coalesce((
        select sum(p.amount) from public.payments p
        where p.booking_id = target_booking_id and p.status = 'submitted'
      ), 0),
      remaining_amount = greatest(total_amount - coalesce((
        select sum(p.amount) from public.payments p
        where p.booking_id = target_booking_id and p.status = 'submitted'
      ), 0), 0),
      updated_at = now()
  where id = target_booking_id;

  return coalesce(new, old);
end;
$$;
