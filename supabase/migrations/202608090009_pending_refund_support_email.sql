create or replace function public.queue_booking_cancellation_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  support_email text;
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
         'booking_canceled',
         coalesce(new.reason, 'Booking was canceled.')
  from public.bookings b
  left join public.profiles p on p.id = b.customer_id
  where b.id = new.booking_id
    and coalesce(nullif(p.email, ''), nullif(b.guest_email, '')) is not null
  on conflict (booking_id, email_type) do nothing;

  if new.refund_status = 'pending_refund' and new.canceled_by is not null then
    select support_email into support_email
    from public.app_settings
    where id = true;

    if nullif(trim(support_email), '') is not null then
      insert into public.booking_email_outbox (
        booking_id,
        recipient_email,
        first_name,
        booking_number,
        email_type,
        reason
      )
      select b.id,
             support_email,
             'Support',
             b.booking_number,
             'booking_refund_pending',
             coalesce(new.reason, 'Customer cancellation requires refund review.')
      from public.bookings b
      where b.id = new.booking_id
      on conflict (booking_id, email_type) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists queue_booking_cancellation_email on public.booking_cancellations;

create trigger queue_booking_cancellation_email
after insert on public.booking_cancellations
for each row execute function public.queue_booking_cancellation_email();
