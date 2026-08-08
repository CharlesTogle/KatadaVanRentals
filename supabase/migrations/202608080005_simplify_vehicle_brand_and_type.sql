alter table public.vehicles
  add column brand text,
  add column vehicle_type text;

update public.vehicles v
set brand = b.name
from public.brands b
where v.brand_id = b.id;

update public.vehicles v
set vehicle_type = vt.name
from public.vehicle_types vt
where v.vehicle_type_id = vt.id;

update public.vehicles
set vehicle_type = 'Others'
where vehicle_type is not null
  and vehicle_type not in ('Car', 'Van', 'Truck', 'Mini Van', 'Mini Bus', 'Others');

alter table public.vehicles
  drop constraint if exists vehicles_brand_id_fkey,
  drop constraint if exists vehicles_vehicle_type_id_fkey,
  drop column brand_id,
  drop column vehicle_type_id,
  add constraint vehicles_vehicle_type_check
    check (vehicle_type is null or vehicle_type in ('Car', 'Van', 'Truck', 'Mini Van', 'Mini Bus', 'Others'));

drop table if exists public.brands;
drop table if exists public.vehicle_types;
