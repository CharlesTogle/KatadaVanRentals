create table public.booking_requested_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status public.document_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_booking_requested_documents_updated_at
  before update on public.booking_requested_documents
  for each row execute function public.set_updated_at();

alter table public.booking_requested_documents enable row level security;

create policy "booking_requested_documents read own booking or admin"
  on public.booking_requested_documents for select
  using (public.is_admin() or exists (
    select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()
  ));

create policy "booking_requested_documents insert own booking or admin"
  on public.booking_requested_documents for insert
  with check (public.is_admin() or (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status = 'awaiting_documents'
    )
  ));

create policy "booking_requested_documents update admin"
  on public.booking_requested_documents for update
  using (public.is_admin()) with check (public.is_admin());

create policy "booking_requested_documents delete admin"
  on public.booking_requested_documents for delete
  using (public.is_admin());

create index booking_requested_docs_booking_idx on public.booking_requested_documents (booking_id);

alter table public.bookings add unique (id, customer_id);

alter table public.booking_requested_documents
  add constraint fk_requested_doc_booking_customer
  foreign key (booking_id, customer_id) references public.bookings(id, customer_id);

grant all on table public.booking_requested_documents to authenticated, service_role;
