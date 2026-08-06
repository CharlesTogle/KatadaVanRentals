alter table public.app_settings
  add column if not exists booking_expiry_hours integer not null default 2;

alter table public.app_settings
  drop constraint if exists app_settings_booking_expiry_hours_check;

alter table public.app_settings
  add constraint app_settings_booking_expiry_hours_check
  check (booking_expiry_hours > 0);
