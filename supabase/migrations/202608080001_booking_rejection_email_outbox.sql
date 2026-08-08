create or replace function public.queue_booking_rejection_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.booking_email_outbox (
    booking_id,
    recipient_email,
    first_name,
    booking_number,
    email_type,
    reason
  )
  select b.id,
         coalesce(nullif(p.email, ''), nullif(b.guest_email, '')),
         coalesce(nullif(p.first_name, ''), nullif(b.guest_name, ''), 'there'),
         b.booking_number,
         'booking_rejected',
         coalesce(new.note, 'Booking request was not accepted.')
  from public.bookings b
  left join public.profiles p on p.id = b.customer_id
  where b.id = new.booking_id
    and coalesce(nullif(p.email, ''), nullif(b.guest_email, '')) is not null
  on conflict (booking_id, email_type) do nothing;

  return new;
end;
$$;

drop trigger if exists queue_booking_rejection_email on public.booking_status_events;

create trigger queue_booking_rejection_email
after insert on public.booking_status_events
for each row
when (new.to_status = 'rejected' and new.note is not null)
execute function public.queue_booking_rejection_email();
