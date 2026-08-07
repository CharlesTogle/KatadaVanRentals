CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION get_tables_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM 1;
END;
$$;

SELECT cron.schedule(
  'daily-table-job',
  '*/30 * * * *',
  'SELECT get_tables_daily();'
);
