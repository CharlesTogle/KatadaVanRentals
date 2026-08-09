-- Run against a database after migrations with: psql "$DATABASE_URL" -f supabase/tests/storage_cleanup_queue.sql
do $$
declare
  has_column boolean;
  has_unique_index boolean;
  policy_definition text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'storage_cleanup_queue'
      and column_name = 'deleting_at'
  ) into has_column;

  if not has_column then
    raise exception 'storage cleanup queue is missing deleting_at';
  end if;

  select exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'storage_cleanup_queue_active_path_idx'
  ) into has_unique_index;

  if not has_unique_index then
    raise exception 'storage cleanup queue is missing active path deduplication';
  end if;

  select pg_get_expr(polqual, polrelid)
  into policy_definition
  from pg_policy
  where polrelid = 'public.storage_cleanup_queue'::regclass
    and polname = 'users can queue allowed storage cleanup';

  if policy_definition is null
    or policy_definition not like '%customer-documents%'
    or policy_definition not like '%payment-receipts%'
    or policy_definition not like '%profile-photos/%' then
    raise exception 'storage cleanup queue policy does not cover supported paths';
  end if;
end;
$$;
