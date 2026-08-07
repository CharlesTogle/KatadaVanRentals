drop trigger if exists recalculate_booking_prices on public.bookings;

create trigger recalculate_booking_prices
before insert or update on public.bookings
for each row
when (new.status <> 'completed')
execute function public.recalculate_booking_prices();
