begin;

-- This JWT role can only receive task invalidation broadcasts. It does not
-- inherit authenticated, anon or service_role. No business-table grants are added.
do $$
begin
  if not exists(select 1 from pg_roles where rolname = 'task_realtime') then
    create role task_realtime nologin noinherit;
  end if;
end $$;
grant task_realtime to authenticator;
grant usage on schema realtime, auth, public to task_realtime;
grant select on realtime.messages to task_realtime;

create function public.can_receive_task_broadcast(topic text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    (auth.jwt()->>'role') = 'task_realtime'
    and coalesce((auth.jwt()->'task_topics') ? topic, false)
    and topic in (
      'tasks:' || (auth.jwt()->>'school_id') || ':inventory',
      'tasks:' || (auth.jwt()->>'school_id') || ':lessons'
    )
    and exists (
      select 1 from public.app_users u
      where u.id::text = (auth.jwt()->>'sub')
        and u.school_id::text = (auth.jwt()->>'school_id')
        and u.is_active = true and u.role in ('teacher','school_admin')
    );
$$;
revoke all on function public.can_receive_task_broadcast(text) from public, anon, authenticated;
grant execute on function public.can_receive_task_broadcast(text) to task_realtime;

-- RLS is already enabled on realtime.messages; do not alter its ownership/RLS.
create policy task_broadcast_receive on realtime.messages
for select to task_realtime
using (extension = 'broadcast' and public.can_receive_task_broadcast((select realtime.topic())));
-- Keep the allowlist effective even if another existing permissive policy
-- grants SELECT to PUBLIC on realtime.messages.
create policy task_broadcast_scope_guard on realtime.messages
as restrictive for select to task_realtime
using (extension = 'broadcast' and public.can_receive_task_broadcast((select realtime.topic())));

create function public.broadcast_task_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare school uuid; topic text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then return new; end if;
    if old.status <> 'submitted' and new.status <> 'submitted' then return new; end if;
  elsif tg_op = 'INSERT' then
    if new.status <> 'submitted' then return new; end if;
  else
    if old.status <> 'submitted' then return old; end if;
  end if;
  school := case when tg_op = 'DELETE' then old.school_id else new.school_id end;
  topic := 'tasks:' || school::text || case when tg_table_name = 'lesson_plans' then ':lessons' else ':inventory' end;
  -- Send an invalidation signal only. Never send row content or identities.
  begin
    perform realtime.send('{}'::jsonb, 'tasks.changed', topic, true);
  exception when others then
    -- Realtime availability must not break the underlying business operation.
    -- The client keeps periodic count refresh as a fallback.
    raise warning 'Task realtime broadcast failed: %', SQLSTATE;
  end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.broadcast_task_change() from public, anon, authenticated, task_realtime;
create trigger inventory_purchases_task_broadcast after insert or update or delete
on public.inventory_purchases for each row execute function public.broadcast_task_change();
create trigger inventory_documents_task_broadcast after insert or update or delete
on public.inventory_documents for each row execute function public.broadcast_task_change();
create trigger lesson_plans_task_broadcast after insert or update or delete
on public.lesson_plans for each row execute function public.broadcast_task_change();

commit;
