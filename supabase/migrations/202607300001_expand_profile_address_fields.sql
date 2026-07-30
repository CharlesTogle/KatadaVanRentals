alter table public.profiles
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists street_address text,
  add column if not exists barangay text;

update public.profiles
set address_line_1 = coalesce(address_line_1, address)
where address is not null
  and address_line_1 is null;
