-- Issue 6: Dashboard revenue computed server-side (audit#6)
-- Prevents incorrect totals from client-side reduce on truncated data sets
-- and adds MTD filtering to match the "Revenue (MTD)" label

create or replace function public.get_dashboard_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'bookings_count', count(*),
    'active_count', count(*) filter (where status = 'on_trip'),
    'review_count', count(*) filter (where status = 'for_review'),
    'mtd_revenue', coalesce(sum(total_amount) filter (where created_at >= date_trunc('month', now())), 0)
  )
  into result
  from public.bookings;

  return result;
end;
$$;

grant execute on function public.get_dashboard_kpis() to authenticated, service_role;
