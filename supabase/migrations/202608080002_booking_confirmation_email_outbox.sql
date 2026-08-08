alter table public.booking_email_outbox
  add column if not exists dates text,
  add column if not exists duration text,
  add column if not exists total text;

create or replace function public.queue_booking_confirmation_email()
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
    reason,
    dates,
    duration,
    total
  )
  select b.id,
         coalesce(nullif(p.email, ''), nullif(b.guest_email, '')),
         coalesce(nullif(p.first_name, ''), nullif(b.guest_name, ''), 'there'),
         b.booking_number,
         'booking_confirmed',
         '',
         to_char(b.start_at at time zone 'Asia/Manila', 'Mon DD, YYYY') || coalesce(' — ' || to_char(b.end_at at time zone 'Asia/Manila', 'Mon DD, YYYY'), ''),
         coalesce(b.duration_days, 1)::text || case when coalesce(b.duration_days, 1) = 1 then ' day' else ' days' end,
         '₱' || to_char(coalesce(b.total_amount, 0), 'FM999,999,999,990.00')
  from public.bookings b
  left join public.profiles p on p.id = b.customer_id
  where b.id = new.booking_id
    and coalesce(nullif(p.email, ''), nullif(b.guest_email, '')) is not null
  on conflict (booking_id, email_type) do nothing;

  return new;
end;
$$;

drop trigger if exists queue_booking_confirmation_email on public.booking_status_events;

create trigger queue_booking_confirmation_email
after insert on public.booking_status_events
for each row
when (new.to_status = 'confirmed' and new.from_status is not null)
execute function public.queue_booking_confirmation_email();
