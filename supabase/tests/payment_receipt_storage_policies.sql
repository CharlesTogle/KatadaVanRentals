-- Run against a database after migrations with: psql "$DATABASE_URL" -f supabase/tests/payment_receipt_storage_policies.sql
do $$
declare
  policy_count integer;
begin
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'payment receipt files own or admin',
      'payment receipt uploads own or admin',
      'payment receipt updates own or admin',
      'payment receipt deletes own or admin'
    );

  if policy_count <> 4 then
    raise exception 'payment receipt storage policies are incomplete';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'payment receipt uploads own'
  ) then
    raise exception 'legacy owner-based payment receipt upload policy is still active';
  end if;
end;
$$;
