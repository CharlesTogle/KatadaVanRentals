create or replace function public.admin_request_booking_documents(
  target_booking_id uuid,
  requested_document_labels text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  label text;
  note_text text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.bookings
    where id = target_booking_id and status = 'for_review'
  ) then
    raise exception 'Booking cannot request documents from current status';
  end if;

  foreach label in array requested_document_labels loop
    insert into public.booking_requested_document_types (booking_id, label)
    values (target_booking_id, label);
  end loop;

  note_text := array_to_string(requested_document_labels, ', ');

  update public.bookings set status = 'awaiting_documents', updated_at = now() where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'for_review', 'awaiting_documents', note_text, auth.uid());
end;
$$;
