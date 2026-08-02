-- Bound rate-limit RPC input and prune expired transient counters. Application
-- identifiers are SHA-256 digests, so usernames and IP addresses are not kept
-- as plaintext in this table after this release.

create index if not exists auth_rate_limits_window_start_idx
  on public.auth_rate_limits (window_start);

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
  if p_identifier is null
    or length(p_identifier) < 1
    or length(p_identifier) > 100
    or p_max_attempts < 1
    or p_max_attempts > 1000
    or p_window_seconds < 1
    or p_window_seconds > 86400
  then
    return false;
  end if;

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

  -- Keep the transient table bounded without adding cleanup work to every call.
  if mod(hashtext(p_identifier), 64) = 0 then
    delete from public.auth_rate_limits
    where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_max_attempts;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
