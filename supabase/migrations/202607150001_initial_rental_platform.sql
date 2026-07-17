create extension if not exists pgcrypto;

create type public.account_role as enum ('customer', 'admin', 'manager', 'staff');
create type public.booking_status as enum ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'rejected', 'canceled', 'on_trip', 'completed');
create type public.rental_model as enum ('all_in', 'all_out', 'self_drive');
create type public.document_type as enum ('driver_license', 'valid_id', 'proof_of_billing');
create type public.document_status as enum ('missing', 'submitted', 'verified', 'rejected', 'expired');
create type public.payment_status as enum ('pending', 'submitted', 'verified', 'rejected', 'refunded');
create type public.payment_channel as enum ('cash', 'bank_transfer', 'ewallet', 'online_gateway');
create type public.feedback_status as enum ('new', 'reviewed', 'approved_testimonial', 'hidden');
create type public.email_status as enum ('queued', 'sent', 'delivered', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'customer',
  first_name text,
  last_name text,
  email text not null,
  mobile text,
  address text,
  city text,
  province text,
  zip text,
  country text not null default 'Philippines',
  profile_image_path text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  vehicle_type_id uuid references public.vehicle_types(id) on delete set null,
  name text not null,
  slug text not null unique,
  plate_number text not null unique,
  description text,
  passenger_count integer not null default 0 check (passenger_count >= 0),
  bag_count integer not null default 0 check (bag_count >= 0),
  transmission text,
  fuel_type text,
  base_price_per_day numeric(12,2) not null check (base_price_per_day >= 0),
  driver_rate_per_day numeric(12,2) not null default 0 check (driver_rate_per_day >= 0),
  km_per_liter numeric(8,2) check (km_per_liter > 0),
  supports_all_in boolean not null default true,
  supports_all_out boolean not null default true,
  supports_self_drive boolean not null default true,
  supports_pickup_dropoff boolean not null default true,
  is_available boolean not null default true,
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Katada Transportation Services',
  support_email text,
  support_phone text,
  business_address text,
  city text,
  province text,
  zip_code text,
  country text not null default 'Philippines',
  tin_number text,
  vat_percent numeric(5,2) not null default 0 check (vat_percent >= 0),
  default_currency text not null default 'PHP',
  guest_booking_enabled boolean not null default true,
  license_capture_mode text not null default 'simple',
  fuel_price_per_liter numeric(10,2) not null default 0 check (fuel_price_per_liter >= 0),
  fuel_price_last_updated date,
  km_per_liter_default numeric(8,2) not null default 8 check (km_per_liter_default > 0),
  peso_per_km numeric(10,2) not null default 0 check (peso_per_km >= 0),
  reservation_percent numeric(5,2) not null default 10 check (reservation_percent between 0 and 100),
  distance_api_provider text not null default 'openrouteservice',
  toll_api_provider text not null default 'tollguru',
  integrations jsonb not null default '{}',
  email_settings jsonb not null default '{}',
  content_settings jsonb not null default '{}',
  subscription jsonb not null default '{"plan":"Kasosyo Free","bookings_per_month":10,"vehicles":3,"team_members":1,"storage_gb":1}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  channel public.payment_channel not null,
  provider text not null,
  branch text,
  account_number text,
  account_name text,
  account_type text,
  currency text not null default 'PHP',
  instructions text,
  qr_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_points (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  address text not null,
  lat numeric(10,7),
  lng numeric(10,7),
  radius_km numeric(10,2) not null default 0 check (radius_km >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  document_type public.document_type not null,
  status public.document_status not null default 'submitted',
  file_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, document_type)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  guest_mobile text,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  rental_model public.rental_model not null,
  status public.booking_status not null default 'for_review',
  start_at timestamptz not null,
  end_at timestamptz,
  duration_days numeric(8,2) not null default 1 check (duration_days > 0),
  pickup_location text,
  pickup_lat numeric(10,7),
  pickup_lng numeric(10,7),
  dropoff_location text,
  dropoff_lat numeric(10,7),
  dropoff_lng numeric(10,7),
  destination text,
  purpose_of_travel text,
  notes text,
  distance_km numeric(10,2) check (distance_km is null or distance_km >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  toll_estimate_amount numeric(12,2) not null default 0 check (toll_estimate_amount >= 0),
  toll_segments jsonb not null default '[]',
  fuel_estimate_liters numeric(10,2) not null default 0 check (fuel_estimate_liters >= 0),
  fuel_estimate_amount numeric(12,2) not null default 0 check (fuel_estimate_amount >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  recovery_fee numeric(12,2) not null default 0 check (recovery_fee >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  subtotal_amount numeric(12,2) not null default 0 check (subtotal_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12,2) not null default 0 check (remaining_amount >= 0),
  price_line_items jsonb not null default '[]',
  override_reasons jsonb not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  canceled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or guest_email is not null)
);

create table public.booking_documents (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_document_id uuid not null references public.customer_documents(id) on delete restrict,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (booking_id, customer_document_id)
);

create table public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  channel public.payment_channel not null,
  status public.payment_status not null default 'submitted',
  amount numeric(12,2) not null check (amount > 0),
  reference_number text,
  receipt_path text,
  paid_at timestamptz,
  submitted_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_extensions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  previous_end_at timestamptz,
  new_end_at timestamptz not null,
  extension_amount numeric(12,2) not null default 0 check (extension_amount >= 0),
  reason text,
  payment_id uuid references public.payments(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.booking_cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  cancellation_type text not null,
  reason text not null,
  canceled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.trip_settlements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  actual_toll_amount numeric(12,2) not null default 0 check (actual_toll_amount >= 0),
  actual_diesel_liters numeric(10,2) not null default 0 check (actual_diesel_liters >= 0),
  actual_diesel_amount numeric(12,2) not null default 0 check (actual_diesel_amount >= 0),
  toll_receipt_path text,
  diesel_receipt_path text,
  variance_amount numeric(12,2) not null default 0,
  settlement_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  invoice_number text not null unique,
  invoice_type text not null default 'booking',
  status text not null default 'issued',
  total_amount numeric(12,2) not null check (total_amount >= 0),
  balance_amount numeric(12,2) not null default 0 check (balance_amount >= 0),
  file_path text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.booking_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  status public.feedback_status not null default 'new',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  email_type text not null default 'general',
  status public.email_status not null default 'queued',
  description text,
  related_profile_id uuid references public.profiles(id) on delete set null,
  related_booking_id uuid references public.bookings(id) on delete set null,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  message text not null,
  source text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'manager', 'staff')
      and is_active
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
    nullif(trim(substring(coalesce(new.raw_user_meta_data->>'full_name', '') from length(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1)) + 1)), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create function public.add_booking_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_events (booking_id, to_status, actor_id)
    values (new.id, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.booking_status_events (booking_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;

  return new;
end;
$$;

create function public.refresh_booking_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_booking_id uuid;
begin
  if tg_op = 'DELETE' then
    target_booking_id = old.booking_id;
  else
    target_booking_id = new.booking_id;
  end if;

  update public.bookings b
  set paid_amount = coalesce((
        select sum(amount)
        from public.payments p
        where p.booking_id = target_booking_id
          and p.status = 'verified'
      ), 0),
      remaining_amount = greatest(total_amount - coalesce((
        select sum(amount)
        from public.payments p
        where p.booking_id = target_booking_id
          and p.status = 'verified'
      ), 0), 0),
      updated_at = now()
  where b.id = target_booking_id;

  return coalesce(new, old);
end;
$$;

create function public.cancel_own_booking(target_booking_id uuid, cancellation_type text, cancellation_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set status = 'canceled',
      canceled_at = now(),
      updated_at = now()
  where id = target_booking_id
    and customer_id = auth.uid()
    and status in ('for_review', 'confirmed');

  if not found then
    raise exception 'Booking cannot be canceled by this customer';
  end if;

  insert into public.booking_cancellations (booking_id, cancellation_type, reason, canceled_by)
  values (target_booking_id, cancellation_type, cancellation_reason, auth.uid());
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger set_app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
create trigger set_payment_methods_updated_at before update on public.payment_methods for each row execute function public.set_updated_at();
create trigger set_service_points_updated_at before update on public.service_points for each row execute function public.set_updated_at();
create trigger set_customer_documents_updated_at before update on public.customer_documents for each row execute function public.set_updated_at();
create trigger set_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger set_trip_settlements_updated_at before update on public.trip_settlements for each row execute function public.set_updated_at();
create trigger set_booking_feedback_updated_at before update on public.booking_feedback for each row execute function public.set_updated_at();
create trigger add_booking_status_event after insert or update of status on public.bookings for each row execute function public.add_booking_status_event();
create trigger refresh_booking_paid_amount after insert or update of status or delete on public.payments for each row execute function public.refresh_booking_paid_amount();

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant select on public.brands, public.vehicle_types, public.vehicles, public.app_settings, public.payment_methods, public.service_points, public.booking_feedback to anon;
grant insert on public.contact_inquiries to anon;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.cancel_own_booking(uuid, text, text) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.vehicle_types enable row level security;
alter table public.vehicles enable row level security;
alter table public.app_settings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.service_points enable row level security;
alter table public.customer_documents enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_documents enable row level security;
alter table public.booking_status_events enable row level security;
alter table public.payments enable row level security;
alter table public.booking_extensions enable row level security;
alter table public.booking_cancellations enable row level security;
alter table public.trip_settlements enable row level security;
alter table public.invoices enable row level security;
alter table public.booking_feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;
alter table public.contact_inquiries enable row level security;

create policy "profiles read own or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own or admin" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "public read active fleet" on public.brands for select using (true);
create policy "admin write brands" on public.brands for all using (public.is_admin()) with check (public.is_admin());
create policy "public read vehicle types" on public.vehicle_types for select using (true);
create policy "admin write vehicle types" on public.vehicle_types for all using (public.is_admin()) with check (public.is_admin());
create policy "public read available vehicles" on public.vehicles for select using (is_available or public.is_admin());
create policy "admin write vehicles" on public.vehicles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read settings" on public.app_settings for select using (true);
create policy "admin write settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "public read active payment methods" on public.payment_methods for select using (is_active or public.is_admin());
create policy "admin write payment methods" on public.payment_methods for all using (public.is_admin()) with check (public.is_admin());
create policy "public read active service points" on public.service_points for select using (is_active or public.is_admin());
create policy "admin write service points" on public.service_points for all using (public.is_admin()) with check (public.is_admin());

create policy "documents read own or admin" on public.customer_documents for select using (customer_id = auth.uid() or public.is_admin());
create policy "documents insert own or admin" on public.customer_documents for insert with check (customer_id = auth.uid() or public.is_admin());
create policy "documents update own pending or admin" on public.customer_documents for update using (customer_id = auth.uid() or public.is_admin()) with check (customer_id = auth.uid() or public.is_admin());
create policy "documents delete admin" on public.customer_documents for delete using (public.is_admin());

create policy "bookings read own or admin" on public.bookings for select using (customer_id = auth.uid() or public.is_admin());
create policy "bookings insert own or admin" on public.bookings for insert with check (customer_id = auth.uid() or public.is_admin());
create policy "bookings update admin" on public.bookings for update using (public.is_admin()) with check (public.is_admin());
create policy "bookings delete admin" on public.bookings for delete using (public.is_admin());

create policy "booking documents read own booking or admin" on public.booking_documents for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "booking documents admin write" on public.booking_documents for all using (public.is_admin()) with check (public.is_admin());
create policy "status events read own booking or admin" on public.booking_status_events for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "status events admin write" on public.booking_status_events for all using (public.is_admin()) with check (public.is_admin());

create policy "payments read own booking or admin" on public.payments for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "payments insert own booking or admin" on public.payments for insert with check (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "payments update admin" on public.payments for update using (public.is_admin()) with check (public.is_admin());
create policy "payments delete admin" on public.payments for delete using (public.is_admin());

create policy "booking extensions read own booking or admin" on public.booking_extensions for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "booking extensions admin write" on public.booking_extensions for all using (public.is_admin()) with check (public.is_admin());
create policy "booking cancellations read own booking or admin" on public.booking_cancellations for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "booking cancellations insert own booking or admin" on public.booking_cancellations for insert with check (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "trip settlements read own booking or admin" on public.trip_settlements for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "trip settlements admin write" on public.trip_settlements for all using (public.is_admin()) with check (public.is_admin());
create policy "invoices read own booking or admin" on public.invoices for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "invoices admin write" on public.invoices for all using (public.is_admin()) with check (public.is_admin());

create policy "feedback read own approved or admin" on public.booking_feedback for select using (public.is_admin() or customer_id = auth.uid() or status = 'approved_testimonial');
create policy "feedback insert own completed booking" on public.booking_feedback for insert with check (customer_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed'));
create policy "feedback update admin" on public.booking_feedback for update using (public.is_admin()) with check (public.is_admin());

create policy "notifications read own" on public.notifications for select using (profile_id = auth.uid() or public.is_admin());
create policy "notifications update own read state" on public.notifications for update using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());
create policy "notifications admin insert" on public.notifications for insert with check (public.is_admin());
create policy "email logs read own or admin" on public.email_logs for select using (public.is_admin() or related_profile_id = auth.uid());
create policy "email logs admin write" on public.email_logs for all using (public.is_admin()) with check (public.is_admin());
create policy "contact inquiries public insert" on public.contact_inquiries for insert with check (true);
create policy "contact inquiries admin read" on public.contact_inquiries for select using (public.is_admin());
create policy "contact inquiries admin update" on public.contact_inquiries for update using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (id) values (true);
insert into public.brands (name) values ('Toyota') on conflict do nothing;
insert into public.vehicle_types (name) values ('Van') on conflict do nothing;
insert into public.payment_methods (channel, provider, account_number, account_name, account_type)
values
  ('bank_transfer', 'BDO', '010960093346', 'Winson Katada', 'Savings'),
  ('ewallet', 'G-Cash', '09064961248', 'Winson Katada', 'Savings');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('customer-documents', 'customer-documents', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('payment-receipts', 'payment-receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('vehicle-images', 'vehicle-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('business-assets', 'business-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "customer document files own folder" on storage.objects for select using (bucket_id = 'customer-documents' and (public.is_admin() or owner = auth.uid()));
create policy "customer document uploads own" on storage.objects for insert with check (bucket_id = 'customer-documents' and owner = auth.uid());
create policy "payment receipt files own" on storage.objects for select using (bucket_id = 'payment-receipts' and (public.is_admin() or owner = auth.uid()));
create policy "payment receipt uploads own" on storage.objects for insert with check (bucket_id = 'payment-receipts' and owner = auth.uid());
create policy "public vehicle images" on storage.objects for select using (bucket_id = 'vehicle-images');
create policy "admin vehicle image uploads" on storage.objects for all using (bucket_id = 'vehicle-images' and public.is_admin()) with check (bucket_id = 'vehicle-images' and public.is_admin());
create policy "public business assets" on storage.objects for select using (bucket_id = 'business-assets');
create policy "admin business asset uploads" on storage.objects for all using (bucket_id = 'business-assets' and public.is_admin()) with check (bucket_id = 'business-assets' and public.is_admin());
create policy "invoice files own booking or admin" on storage.objects for select using (bucket_id = 'invoices' and (public.is_admin() or owner = auth.uid()));
create policy "admin invoice uploads" on storage.objects for all using (bucket_id = 'invoices' and public.is_admin()) with check (bucket_id = 'invoices' and public.is_admin());

create index profiles_email_idx on public.profiles (email);
create index vehicles_available_idx on public.vehicles (is_available);
create index customer_documents_customer_idx on public.customer_documents (customer_id);
create index bookings_customer_idx on public.bookings (customer_id);
create index bookings_vehicle_dates_idx on public.bookings (vehicle_id, start_at, end_at);
create index bookings_status_idx on public.bookings (status);
create index booking_status_events_booking_idx on public.booking_status_events (booking_id, created_at);
create index payments_booking_idx on public.payments (booking_id);
create index payments_verified_idx on public.payments (verified_at) where status = 'verified';
create index email_logs_search_idx on public.email_logs (recipient_email, email_type, created_at);
create index notifications_profile_unread_idx on public.notifications (profile_id, created_at) where read_at is null;
