alter table public.booking_feedback
  add column display_on_homepage boolean not null default false;

create or replace function public.enforce_homepage_testimonial_limit()
returns trigger
language plpgsql
as $$
begin
  if new.display_on_homepage and (
    select count(*) from public.booking_feedback
    where display_on_homepage and id <> new.id
  ) >= 10 then
    raise exception 'Only 10 feedback entries can be displayed on the homepage';
  end if;

  return new;
end;
$$;

create trigger booking_feedback_homepage_limit
before insert or update of display_on_homepage on public.booking_feedback
for each row execute function public.enforce_homepage_testimonial_limit();

drop policy if exists "feedback read own approved or admin" on public.booking_feedback;
create policy "feedback read own homepage or admin" on public.booking_feedback
for select using (public.is_admin() or customer_id = auth.uid() or display_on_homepage);
