# Payment Consistency

## Canonical meanings

- `total_amount`: the contractual rental total. Fuel and toll estimates are excluded.
- `deposit_amount`: the required security deposit calculated for the booking.
- `paid_amount`: the sum of `payments.amount` where `payments.status = 'submitted'`.
- `remaining_amount`: `greatest(total_amount - paid_amount, 0)`.
- Submitted payments: accepted payment submissions. Admin booking confirmation is the verification boundary; payment rows remain `submitted`.
- Rejected payments: excluded from `paid_amount`, invoices, and revenue reports.
- Estimates: display-only projections. Actual fuel and toll are added once during completion reconciliation.

## Pre-deployment anomaly query

```sql
select b.id, b.booking_number, b.total_amount, b.paid_amount, b.remaining_amount
from public.bookings b
where b.remaining_amount <> greatest(b.total_amount - b.paid_amount, 0)
   or b.paid_amount <> (
     select coalesce(sum(p.amount), 0)
     from public.payments p
     where p.booking_id = b.id
       and p.status = 'submitted'
   );
```

Run `supabase/tests/payment_invariants.sql` after applying the migration. Any anomaly should be repaired with `public.recalculate_booking_financials(booking_id)` and the query rerun until it returns zero rows.

## Retry and concurrency check

Run two identical RPC calls concurrently with the same idempotency key. The unique payment operation index and row lock must produce one payment and one financial recalculation. Repeat this check for booking creation, extension, completion reconciliation, and post-completion payment collection.
