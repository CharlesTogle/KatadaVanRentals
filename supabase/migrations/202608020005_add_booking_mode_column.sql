alter table public.bookings add column if not exists booking_mode text not null default 'keep' check (booking_mode in ('dropoff', 'keep'));
