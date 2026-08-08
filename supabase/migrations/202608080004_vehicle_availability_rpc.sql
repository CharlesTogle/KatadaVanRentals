create or replace function public.get_vehicle_unavailable_ranges(
  p_vehicle_id uuid,
  p_from_at timestamptz default now(),
  p_to_at timestamptz default now() + interval '2 years'
)
returns table(start_at timestamptz, end_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from_at >= p_to_at then
    raise exception 'Invalid availability range: from must be before to.';
  end if;

  return query
  select b.start_at, b.end_at
  from public.bookings b
  where b.vehicle_id = p_vehicle_id
    and b.status in ('for_review', 'awaiting_documents', 'pending_price_approval', 'confirmed', 'on_trip')
    and b.start_at < p_to_at
    and (b.end_at is null or b.end_at > p_from_at)
  order by b.start_at;
end;
$$;

grant execute on function public.get_vehicle_unavailable_ranges(uuid, timestamptz, timestamptz) to anon, authenticated;
