drop function if exists public.search_admin_customers(text);

create function public.search_admin_customers(
  search_query text default null,
  page_number integer default 1,
  page_size integer default 20
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
  total_spend numeric(12,2),
  total_count bigint
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
    coalesce(bs.total_spend, 0) as total_spend,
    count(*) over () as total_count
  from public.profiles p
  left join (
    select customer_id, count(*) as bookings_count, coalesce(sum(total_amount), 0) as total_spend
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
  order by p.created_at desc
  offset greatest(page_number - 1, 0) * page_size
  limit page_size;
$$;

grant execute on function public.search_admin_customers(text, integer, integer) to authenticated;
