begin;
alter table public.notifications add column event_key text;
create unique index notifications_event_recipient_key on public.notifications(user_id,event_key);
create index notifications_user_school_date on public.notifications(user_id,school_id,created_at desc);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  kind text not null,
  source_id uuid not null,
  status text not null,
  owner_id uuid,
  actor_id uuid,
  title text not null,
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  claim_token uuid,
  claimed_until timestamptz
);
alter table public.notification_events enable row level security;
revoke all on public.notification_events from public, anon, authenticated, task_realtime;
grant all on public.notification_events to service_role;
create index notification_events_pending on public.notification_events(school_id,created_at) where processed_at is null;

create function public.claim_notification_events(p_school uuid,p_token uuid)
returns setof public.notification_events language sql security definer set search_path='' as $$
  update public.notification_events e set claim_token=p_token,claimed_until=now()+interval '2 minutes'
  where id in (
    select id from public.notification_events
    where school_id=p_school and processed_at is null and (claimed_until is null or claimed_until<now())
    order by created_at limit 10 for update skip locked
  ) returning e.*;
$$;
revoke all on function public.claim_notification_events(uuid,uuid) from public,anon,authenticated,task_realtime;
grant execute on function public.claim_notification_events(uuid,uuid) to service_role;

create function public.enqueue_workflow_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=to_jsonb(new); owner uuid; actor uuid; kind text;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  if tg_table_name='lesson_plans' then
    if new.status not in ('submitted','approved','revision') then return new; end if;
    kind:='lesson_plan'; owner:=new.teacher_id;
  elsif tg_table_name='inventory_purchases' then
    if new.status not in ('submitted','approved','rejected','ordered','partially_received','received') then return new; end if;
    kind:='inventory_purchase'; owner:=new.created_by;
  else
    if new.kind<>'issue' or new.status not in ('submitted','posted','rejected') then return new; end if;
    kind:='inventory_issue'; owner:=new.created_by;
  end if;
  actor:=case when new.status='submitted' then owner else nullif(row_data->>'reviewed_by','')::uuid end;
  insert into public.notification_events(school_id,kind,source_id,status,owner_id,actor_id,title,note)
  values(new.school_id,kind,new.id,new.status,owner,actor,
    left(coalesce(row_data->>'title',row_data->>'reference_number',row_data->>'recipient',''),200),
    left(row_data->>'review_note',2000));
  return new;
end $$;
revoke all on function public.enqueue_workflow_notification() from public,anon,authenticated,task_realtime;
create trigger inventory_purchase_inbox_event after insert or update on public.inventory_purchases
for each row execute function public.enqueue_workflow_notification();
create trigger inventory_issue_inbox_event after insert or update on public.inventory_documents
for each row execute function public.enqueue_workflow_notification();
create trigger lesson_plan_inbox_event after insert or update on public.lesson_plans
for each row execute function public.enqueue_workflow_notification();

-- Wake clients for queued workflows and individual inbox changes, including
-- notifications created by existing timetable/grade/invitation integrations.
create function public.broadcast_inbox_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare topic text;
begin
  if tg_table_name='notification_events' then
    topic:='notifications:'||new.school_id::text;
  else
    topic:='inbox:'||new.school_id::text||':'||new.user_id::text;
  end if;
  begin
    perform realtime.send('{}'::jsonb,'notifications.changed',topic,true);
  exception when others then
    raise warning 'Inbox realtime broadcast failed: %',SQLSTATE;
  end;
  return new;
end $$;
revoke all on function public.broadcast_inbox_change() from public,anon,authenticated,task_realtime;
create trigger notification_events_broadcast after insert on public.notification_events
for each row execute function public.broadcast_inbox_change();
create trigger notifications_inbox_broadcast after insert or update of read_at on public.notifications
for each row execute function public.broadcast_inbox_change();

create or replace function public.can_receive_task_broadcast(topic text)
returns boolean language sql stable security definer set search_path='' as $$
  select (auth.jwt()->>'role')='task_realtime'
    and coalesce((auth.jwt()->'task_topics') ? topic,false)
    and topic in (
      'tasks:'||(auth.jwt()->>'school_id')||':inventory',
      'tasks:'||(auth.jwt()->>'school_id')||':lessons',
      'notifications:'||(auth.jwt()->>'school_id'),
      'inbox:'||(auth.jwt()->>'school_id')||':'||(auth.jwt()->>'sub')
    )
    and exists(select 1 from public.app_users u
      where u.id::text=auth.jwt()->>'sub' and u.school_id::text=auth.jwt()->>'school_id'
        and u.is_active=true and u.role in ('teacher','school_admin','student'));
$$;

-- Duty assignments are already explicit recipients; no permission resolution
-- is required. Each assignment produces one inbox item in the same transaction.
create function public.notify_duty_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare duty public.school_duty_schedules%rowtype;
begin
  select * into duty from public.school_duty_schedules where id=new.schedule_id;
  insert into public.notifications(user_id,school_id,type,title,body,link,event_key)
  select u.id,duty.school_id,'duty_assigned','ได้รับมอบหมายเวร',
    duty.duty_date::text||' · '||duty.starts_at::text||' · '||duty.location,
    '/teacher/duty-roster/'||duty.id::text,'duty:'||new.id::text
  from public.app_users u where u.id=new.staff_id and u.school_id=duty.school_id and u.is_active=true
  on conflict(user_id,event_key) do nothing;
  return new;
end $$;
revoke all on function public.notify_duty_assignment() from public,anon,authenticated,task_realtime;
create trigger duty_assignment_inbox after insert on public.school_duty_assignees
for each row execute function public.notify_duty_assignment();
commit;
