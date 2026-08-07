create or replace function public.get_homepage_testimonials()
returns table (
  id uuid,
  rating integer,
  feedback text,
  created_at timestamptz,
  customer_name text,
  profile_image_path text
)
language sql
security definer
set search_path = public
as $$
  select
    bf.id,
    bf.rating,
    bf.feedback,
    bf.created_at,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Katada customer'),
    p.profile_image_path
  from public.booking_feedback bf
  join public.profiles p on p.id = bf.customer_id
  where bf.display_on_homepage = true
  order by bf.created_at desc
  limit 10;
$$;

grant execute on function public.get_homepage_testimonials() to anon, authenticated;
