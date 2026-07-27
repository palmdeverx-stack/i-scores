-- Basic brute-force protection for the custom sign-in endpoint (this app's
-- own app_users table, not Supabase Auth, so Supabase's built-in rate
-- limiting doesn't cover it). Tracks attempts per identifier (IP or
-- username) in a fixed window; check_rate_limit atomically increments and
-- resets the window in a single upsert, so concurrent requests can't race
-- past the limit. Row count stays bounded by distinct IPs/usernames ever
-- seen, not by request volume, since each identifier reuses one row.

create table public.auth_rate_limits (
  identifier text primary key,
  attempt_count integer not null default 1,
  window_start timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.auth_rate_limits (identifier, attempt_count, window_start)
  values (p_identifier, 1, now())
  on conflict (identifier) do update
    set attempt_count = case
          when auth_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else auth_rate_limits.attempt_count + 1
        end,
        window_start = case
          when auth_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else auth_rate_limits.window_start
        end
  returning attempt_count into v_count;

  return v_count <= p_max_attempts;
end;
$$;
