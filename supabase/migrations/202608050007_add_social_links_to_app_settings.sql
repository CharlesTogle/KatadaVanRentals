alter table public.app_settings
  add column if not exists facebook_link text not null default '',
  add column if not exists instagram_link text not null default '',
  add column if not exists logo_url text;
