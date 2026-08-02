create table if not exists public.edge_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_global_rate_limit(
  limit_key text,
  max_requests integer,
  window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window_started_at timestamptz;
  current_request_count integer;
begin
  if limit_key is null or limit_key = '' then
    raise exception 'limit_key is required';
  end if;

  if max_requests <= 0 then
    raise exception 'max_requests must be positive';
  end if;

  if window_seconds <= 0 then
    raise exception 'window_seconds must be positive';
  end if;

  current_window_started_at := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);

  perform pg_advisory_xact_lock(hashtextextended(limit_key, 0));

  insert into public.edge_rate_limits as erl (key, window_started_at, request_count, updated_at)
  values (limit_key, current_window_started_at, 1, now())
  on conflict (key) do update
  set window_started_at = case
        when erl.window_started_at = current_window_started_at then erl.window_started_at
        else current_window_started_at
      end,
      request_count = case
        when erl.window_started_at = current_window_started_at then erl.request_count + 1
        else 1
      end,
      updated_at = now()
  returning request_count, window_started_at
  into current_request_count, current_window_started_at;

  return query
  select
    current_request_count <= max_requests,
    case
      when current_request_count <= max_requests then 0
      else greatest(1, window_seconds - floor(extract(epoch from now() - current_window_started_at))::integer)
    end;
end;
$$;

grant execute on function public.consume_global_rate_limit(text, integer, integer) to service_role;
