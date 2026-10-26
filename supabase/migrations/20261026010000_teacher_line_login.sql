begin;
-- LINE Login identities are deliberately separate from Messaging API / OA links.
create table public.teacher_line_login_links (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null unique references public.app_users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  line_subject text not null unique check(length(line_subject) between 1 and 255),
  channel_id text not null,
  display_name text not null default '',
  linked_at timestamptz not null default now(),
  last_login_at timestamptz
);
create table public.line_login_flows (
  state_hash text primary key check(state_hash ~ '^[a-f0-9]{64}$'),
  browser_hash text not null check(browser_hash ~ '^[a-f0-9]{64}$'),
  intent text not null check(intent in ('login','link')),
  app_user_id uuid references public.app_users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  session_hash text,
  channel_id text not null,
  redirect_uri text not null,
  nonce text,
  pkce_verifier text,
  verified_subject text,
  verified_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  confirmed_at timestamptz,
  check((intent='login' and app_user_id is null and school_id is null and session_hash is null)
    or (intent='link' and app_user_id is not null and school_id is not null and session_hash is not null))
);
create index line_login_flows_expiry on public.line_login_flows(expires_at);
alter table public.teacher_line_login_links enable row level security;
alter table public.line_login_flows enable row level security;
revoke all on public.teacher_line_login_links,public.line_login_flows from public,anon,authenticated;
grant all on public.teacher_line_login_links,public.line_login_flows to service_role;

create function public.claim_line_login_flow(p_state text,p_browser text)
returns setof public.line_login_flows language sql set search_path='' as $$
  update public.line_login_flows set used_at=now()
  where state_hash=p_state and browser_hash=p_browser and used_at is null and expires_at>now()
  returning *;
$$;
create function public.confirm_teacher_line_login(p_state text,p_browser text,p_user uuid,p_school uuid,p_session text)
returns uuid language plpgsql set search_path='' as $$
declare flow public.line_login_flows%rowtype; linked public.teacher_line_login_links%rowtype;
begin
  perform 1 from public.app_users where id=p_user and school_id=p_school and role='teacher' and is_active=true for update;
  if not found then raise exception 'Teacher account unavailable'; end if;
  select * into flow from public.line_login_flows where state_hash=p_state and browser_hash=p_browser for update;
  if not found or flow.intent<>'link' or flow.app_user_id<>p_user or flow.school_id<>p_school
    or flow.session_hash is distinct from p_session or flow.expires_at<=now() or flow.used_at is null
    or flow.verified_subject is null then raise exception 'Link confirmation unavailable'; end if;
  if flow.confirmed_at is not null then
    select * into linked from public.teacher_line_login_links where app_user_id=p_user;
    if linked.line_subject=flow.verified_subject and linked.channel_id=flow.channel_id and linked.school_id=p_school then return linked.id; end if;
    raise exception 'Link confirmation already used';
  end if;
  select * into linked from public.teacher_line_login_links where app_user_id=p_user;
  if found then
    if linked.line_subject<>flow.verified_subject or linked.channel_id<>flow.channel_id or linked.school_id<>p_school then raise exception 'Teacher already linked'; end if;
  else
    insert into public.teacher_line_login_links(app_user_id,school_id,line_subject,channel_id,display_name)
      values(p_user,p_school,flow.verified_subject,flow.channel_id,coalesce(flow.verified_name,'')) returning * into linked;
  end if;
  update public.line_login_flows set confirmed_at=now(),nonce=null,pkce_verifier=null where state_hash=p_state;
  return linked.id;
end $$;
create function public.unlink_teacher_line_login(p_user uuid,p_school uuid)
returns void language plpgsql set search_path='' as $$
begin
  perform 1 from public.app_users where id=p_user and school_id=p_school and role='teacher' and is_active=true for update;
  if not found then raise exception 'Teacher account unavailable'; end if;
  delete from public.teacher_line_login_links where app_user_id=p_user;
  update public.line_login_flows set expires_at=now(),nonce=null,pkce_verifier=null
    where app_user_id=p_user and intent='link' and confirmed_at is null;
end $$;
-- Bound retention for short-lived server-side OAuth transactions.
create function public.prune_line_login_flows() returns trigger language plpgsql set search_path='' as $$
begin
  delete from public.line_login_flows where expires_at<now()-interval '1 day';
  return new;
end $$;
create trigger prune_line_login_flows before insert on public.line_login_flows
for each statement execute function public.prune_line_login_flows();
revoke all on function public.claim_line_login_flow(text,text) from public,anon,authenticated;
revoke all on function public.confirm_teacher_line_login(text,text,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.unlink_teacher_line_login(uuid,uuid) from public,anon,authenticated;
revoke all on function public.prune_line_login_flows() from public,anon,authenticated;
grant execute on function public.claim_line_login_flow(text,text) to service_role;
grant execute on function public.confirm_teacher_line_login(text,text,uuid,uuid,text) to service_role;
grant execute on function public.unlink_teacher_line_login(uuid,uuid) to service_role;
commit;
