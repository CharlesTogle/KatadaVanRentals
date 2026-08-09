drop function if exists public.get_fleet_unavailable_dates(date, date);

create or replace function public.get_available_vehicle_ids(
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table(vehicle_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_start_at is null then
    raise exception 'Pickup date is required.';
  end if;

  if p_end_at is not null and p_start_at >= p_end_at then
    raise exception 'Invalid availability range: start must be before end.';
  end if;

  return query
  select v.id
  from public.vehicles v
  where v.is_available = true
    and not exists (
      select 1
      from public.bookings b
      where b.vehicle_id = v.id
        and b.status in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip')
        and (
          (p_end_at is null and (b.end_at is null or b.end_at > p_start_at))
          or (p_end_at is not null and b.start_at < p_end_at and (b.end_at is null or b.end_at > p_start_at))
        )
    )
  order by v.id;
end;
$$;

grant execute on function public.get_available_vehicle_ids(timestamptz, timestamptz) to anon, authenticated;
