-- Run against a database after migrations with: psql "$DATABASE_URL" -f supabase/tests/payment_invariants.sql
set local statement_timeout = '10s';

do $$
declare
  anomaly_count integer;
  index_count integer;
begin
  if exists (select 1 from public.payments where status = 'verified') then
    raise exception 'verified payment rows still exist';
  end if;

  select count(*) into anomaly_count
  from public.bookings b
  where b.remaining_amount <> greatest(b.total_amount - b.paid_amount, 0)
     or b.paid_amount <> (
       select coalesce(sum(p.amount), 0)
       from public.payments p
       where p.booking_id = b.id and p.status = 'submitted'
     );

  if anomaly_count <> 0 then
    raise exception '% booking financial anomalies found', anomaly_count;
  end if;

  if exists (select 1 from public.bookings where remaining_amount < 0 or remaining_amount > total_amount) then
    raise exception 'booking remaining amount bounds violated';
  end if;

  select count(*) into index_count
  from pg_class
  where relname = 'payments_booking_idempotency_key_idx';
  if index_count <> 1 then
    raise exception 'payment idempotency index is missing';
  end if;
end;
$$;
