create or replace function public.get_fleet_unavailable_dates(
  p_from_date date default current_date,
  p_to_date date default current_date + 730
)
returns table(unavailable_date date)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from_date >= p_to_date then
    raise exception 'Invalid availability range: from must be before to.';
  end if;

  return query
  select days::date
  from generate_series(p_from_date::timestamp, (p_to_date - 1)::timestamp, interval '1 day') as dates(days)
  where not exists (
    select 1
    from public.vehicles v
    where v.is_available = true
      and not exists (
        select 1
        from public.bookings b
        where b.vehicle_id = v.id
          and b.status in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip')
          and b.start_at < (days + interval '1 day')
          and (b.end_at is null or b.end_at > days)
      )
  )
  order by days;
end;
$$;

grant execute on function public.get_fleet_unavailable_dates(date, date) to anon, authenticated;
