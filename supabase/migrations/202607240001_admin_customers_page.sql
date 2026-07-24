-- Admin customer list RPC: returns enriched customer rows with booking metrics.
-- Filters by name, email, or mobile; only returns customers.

create or replace function public.search_admin_customers(
  search_query text default null
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  mobile text,
  city text,
  province text,
  country text,
  joined_at timestamptz,
  last_login_at timestamptz,
  is_active boolean,
  bookings_count bigint,
  total_spend numeric(12,2)
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.mobile,
    p.city,
    p.province,
    p.country,
    p.created_at as joined_at,
    p.last_login_at,
    p.is_active,
    coalesce(bs.bookings_count, 0) as bookings_count,
    coalesce(bs.total_spend, 0) as total_spend
  from public.profiles p
  left join (
    select
      customer_id,
      count(*) as bookings_count,
      coalesce(sum(total_amount), 0) as total_spend
    from public.bookings
    group by customer_id
  ) bs on bs.customer_id = p.id
  where p.role = 'customer'
    and (
      search_query is null
      or p.first_name ilike '%' || search_query || '%'
      or p.last_name ilike '%' || search_query || '%'
      or p.email ilike '%' || search_query || '%'
      or p.mobile ilike '%' || search_query || '%'
    )
  order by p.created_at desc;
$$;

-- Admin toggle customer active state RPC
create or replace function public.admin_set_customer_active(
  target_customer_id uuid,
  active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_customer_id and role = 'customer'
  ) then
    raise exception 'Target is not a customer';
  end if;

  update public.profiles
  set is_active = active,
      updated_at = now()
  where id = target_customer_id;
end;
$$;

grant execute on function public.search_admin_customers(text) to authenticated;
grant execute on function public.admin_set_customer_active(uuid, boolean) to authenticated;
