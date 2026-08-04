create or replace function public.get_revenue_report(
  from_date timestamptz default null,
  to_date timestamptz default null
)
returns table (
  id uuid,
  booking_id uuid,
  channel payment_channel,
  status payment_status,
  amount numeric,
  reference_number text,
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz,
  booking_number text,
  customer_id uuid,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  vehicle_id uuid,
  vehicle_name text,
  vehicle_plate text,
  payment_method_provider text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id,
    p.booking_id,
    p.channel,
    p.status,
    p.amount,
    p.reference_number,
    p.verified_at,
    p.paid_at,
    p.created_at,
    b.booking_number,
    b.customer_id,
    pr.first_name,
    pr.last_name,
    pr.email,
    b.vehicle_id,
    v.name,
    v.plate_number,
    pm.provider
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  left join public.profiles pr on pr.id = b.customer_id
  join public.vehicles v on v.id = b.vehicle_id
  left join public.payment_methods pm on pm.id = p.payment_method_id
  where p.status = 'verified'
    and (from_date is null or p.paid_at >= from_date)
    and (to_date is null or p.paid_at <= to_date)
  order by p.paid_at desc;
end;
$$;

grant execute on function public.get_revenue_report(timestamptz, timestamptz) to authenticated;
