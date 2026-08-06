alter table public.app_settings
  drop column if exists integrations,
  drop column if exists email_settings,
  drop column if exists content_settings,
  drop column if exists distance_api_provider,
  drop column if exists toll_api_provider,
  drop column if exists guest_booking_enabled;

drop table if exists public.contact_inquiries cascade;
drop table if exists public.email_logs cascade;
drop table if exists public.notifications cascade;
