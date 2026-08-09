-- Rejected bookings do not imply that their recorded payments were refunded.
update public.payments
set status = 'submitted',
    updated_at = now()
where status = 'refunded'
  and exists (
    select 1
    from public.bookings
    where bookings.id = payments.booking_id
      and bookings.status = 'rejected'
  );
