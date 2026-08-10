-- Cascading payment deletes happen as part of deleting their booking.
-- The booking is unavailable by the time the payment trigger runs.
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

  if old.booking_id is distinct from new.booking_id then
    perform public.recalculate_booking_financials(old.booking_id);
  end if;

  perform public.recalculate_booking_financials(new.booking_id);
  return new;
end;
$$;
