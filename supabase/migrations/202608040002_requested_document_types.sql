create table public.booking_requested_document_types (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_requested_documents
  add column requested_type_id uuid references public.booking_requested_document_types(id) on delete set null;

alter table public.booking_requested_documents
  add unique (requested_type_id);

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
  prev_status public.booking_status;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select status into prev_status from public.bookings where id = target_booking_id;

  if prev_status is null then
    raise exception 'Booking not found';
  end if;

  if prev_status not in ('for_review', 'awaiting_documents') then
    raise exception 'Booking cannot request documents from current status';
  end if;

  foreach label in array requested_document_labels loop
    insert into public.booking_requested_document_types (booking_id, label)
    values (target_booking_id, label);
  end loop;

  note_text := array_to_string(requested_document_labels, ', ');

  update public.bookings set status = 'awaiting_documents', updated_at = now() where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, prev_status, 'awaiting_documents', note_text, auth.uid());
end;
$$;

alter table public.booking_requested_document_types add unique (id, booking_id);

alter table public.booking_requested_documents
  add constraint fk_booking_requested_doc_type
    foreign key (requested_type_id, booking_id)
    references public.booking_requested_document_types(id, booking_id);

alter table public.booking_requested_document_types enable row level security;

create policy "booking_requested_document_types read own booking or admin"
  on public.booking_requested_document_types for select
  using (public.is_admin() or exists (
    select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()
  ));

create policy "booking_requested_document_types admin write"
  on public.booking_requested_document_types for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "booking_requested_documents update own" on public.booking_requested_documents;

create policy "booking_requested_documents update own"
  on public.booking_requested_documents for update
  using (customer_id = auth.uid() and exists (
    select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'awaiting_documents'
  ))
  with check (customer_id = auth.uid());

drop policy if exists "booking_requested_documents delete own" on public.booking_requested_documents;

create policy "booking_requested_documents delete own"
  on public.booking_requested_documents for delete
  using (customer_id = auth.uid() and exists (
    select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'awaiting_documents'
  ));

create index booking_requested_doc_types_booking_idx on public.booking_requested_document_types (booking_id);
create index booking_requested_docs_type_idx on public.booking_requested_documents (requested_type_id);

grant all on table public.booking_requested_document_types to authenticated, service_role;
