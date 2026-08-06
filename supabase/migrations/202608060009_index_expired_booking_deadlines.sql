create index if not exists bookings_pending_expiry_start_at_idx
  on public.bookings (start_at)
  where status in ('for_review', 'awaiting_documents');
