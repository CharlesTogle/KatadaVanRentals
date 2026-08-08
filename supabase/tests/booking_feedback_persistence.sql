-- Run against a database after migrations with: psql "$DATABASE_URL" -f supabase/tests/booking_feedback_persistence.sql
do $$
declare
  booking_id_attnotnull boolean;
  delete_action "char";
begin
  select a.attnotnull, c.confdeltype
  into booking_id_attnotnull, delete_action
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid
   and a.attnum = c.conkey[1]
  where c.conrelid = 'public.booking_feedback'::regclass
    and c.conname = 'booking_feedback_booking_id_fkey';

  if booking_id_attnotnull is distinct from false or delete_action is distinct from 'n' then
    raise exception 'booking feedback must survive booking deletion with a null booking_id';
  end if;
end;
$$;
