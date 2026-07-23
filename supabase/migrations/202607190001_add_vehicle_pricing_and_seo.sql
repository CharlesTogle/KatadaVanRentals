-- Add vehicle pricing extras, SEO, and year columns
alter table public.vehicles
  add column year integer,
  add column excess_rate_per_hour numeric(12,2) not null default 0 check (excess_rate_per_hour >= 0),
  add column auto_full_day_after_hours integer not null default 12 check (auto_full_day_after_hours > 0),
  add column twelve_hour_rate numeric(12,2) check (twelve_hour_rate is null or twelve_hour_rate >= 0),
  add column car_wash_fee numeric(12,2) not null default 0 check (car_wash_fee >= 0),
  add column delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  add column security_deposit numeric(12,2) not null default 0 check (security_deposit >= 0),
  add column discount numeric(12,2) not null default 0 check (discount >= 0),
  add column meta_title text,
  add column meta_description text;
