alter table public.bookings
  drop constraint if exists no_overlapping_active_bookings;

alter table public.bookings
  add constraint no_overlapping_active_bookings
  exclude using gist (
    vehicle_id with =,
    tstzrange(
      start_at,
      coalesce(end_at, start_at),
      case when end_at is null then '[]' else '[)' end
    ) with &&
  )
  where (status in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip'));
