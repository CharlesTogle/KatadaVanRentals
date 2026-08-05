alter table public.app_settings
  add column if not exists timezone text not null default 'Asia/Manila',
  add column if not exists date_format text not null default 'MM/DD/YYYY',
  add column if not exists time_format text not null default '12-hour (1:00 PM)';

alter table public.app_settings
  drop column if exists subscription;
