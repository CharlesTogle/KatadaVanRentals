-- Keep customer feedback after its booking is removed.
alter table public.booking_feedback
  alter column booking_id drop not null;

alter table public.booking_feedback
  drop constraint if exists booking_feedback_booking_id_fkey,
  add constraint booking_feedback_booking_id_fkey
    foreign key (booking_id) references public.bookings(id) on delete set null;
