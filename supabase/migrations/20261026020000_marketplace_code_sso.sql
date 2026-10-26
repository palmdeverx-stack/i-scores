begin;
-- A LINE-only Marketplace buyer need not own an E-KRU Supabase Auth identity.
alter table public.marketplace_users alter column auth_user_id drop not null;
alter table public.marketplace_users alter column email drop not null;
create table public.marketplace_sso_identities (
  id uuid primary key default gen_random_uuid(),
  issuer text not null check(issuer='https://e-kru-marketplace.com'),
  subject text not null check(length(subject) between 1 and 255),
  remote_user_id text not null,
  account_type text not null,
  display_name text not null default '',
  app_user_id uuid references public.app_users(id) on delete restrict,
  marketplace_user_id uuid references public.marketplace_users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(issuer,subject),
  check(num_nonnulls(app_user_id,marketplace_user_id)<=1)
);
create table public.marketplace_sso_transactions (
  id uuid primary key,
  state_hash text not null unique,
  code_hash text unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  identity_id uuid references public.marketplace_sso_identities(id),
  pending_kind text check(pending_kind in ('link','pin')),
  completed_at timestamptz,
  check(expires_at<=created_at+interval '5 minutes')
);
create index marketplace_sso_transactions_expiry on public.marketplace_sso_transactions(expires_at);
alter table public.marketplace_sso_identities enable row level security;
alter table public.marketplace_sso_transactions enable row level security;
revoke all on public.marketplace_sso_identities,public.marketplace_sso_transactions from public,anon,authenticated;
grant all on public.marketplace_sso_identities,public.marketplace_sso_transactions to service_role;
create function public.claim_marketplace_sso(p_id uuid,p_state text,p_code text)
returns setof public.marketplace_sso_transactions language sql set search_path='' as $$
  update public.marketplace_sso_transactions set claimed_at=now(),code_hash=p_code
  where id=p_id and state_hash=p_state and claimed_at is null and expires_at>now() returning *;
$$;
create function public.complete_marketplace_sso(p_id uuid,p_identity uuid,p_kind text,p_app uuid,p_buyer uuid)
returns void language plpgsql set search_path='' as $$
declare tx public.marketplace_sso_transactions%rowtype; identity public.marketplace_sso_identities%rowtype;
begin
  select * into tx from public.marketplace_sso_transactions where id=p_id for update;
  if not found or tx.claimed_at is null or tx.completed_at is not null or tx.expires_at<=now()
    or tx.identity_id is distinct from p_identity or tx.pending_kind is distinct from p_kind then raise exception 'SSO transaction unavailable'; end if;
  select * into identity from public.marketplace_sso_identities where id=p_identity for update;
  if not found or not identity.is_active then raise exception 'Identity unavailable'; end if;
  if num_nonnulls(p_app,p_buyer)<>1 then raise exception 'One account required'; end if;
  if p_app is not null then
    perform 1 from public.app_users where id=p_app and is_active=true;
  else
    perform 1 from public.marketplace_users where id=p_buyer and is_active=true;
  end if;
  if not found then raise exception 'Account unavailable'; end if;
  if identity.app_user_id is not null or identity.marketplace_user_id is not null then
    if identity.app_user_id is distinct from p_app or identity.marketplace_user_id is distinct from p_buyer then raise exception 'Identity already linked'; end if;
  elsif p_kind='link' then
    update public.marketplace_sso_identities set app_user_id=p_app,marketplace_user_id=p_buyer where id=p_identity;
  else raise exception 'Identity not linked'; end if;
  update public.marketplace_sso_transactions set completed_at=now() where id=p_id;
end $$;
revoke all on function public.claim_marketplace_sso(uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_marketplace_sso(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_marketplace_sso(uuid,text,text) to service_role;
grant execute on function public.complete_marketplace_sso(uuid,uuid,text,uuid,uuid) to service_role;
create function public.create_marketplace_sso_buyer(p_id uuid,p_identity uuid)
returns uuid language plpgsql set search_path='' as $$
declare tx public.marketplace_sso_transactions%rowtype; identity public.marketplace_sso_identities%rowtype; buyer uuid;
begin
  select * into tx from public.marketplace_sso_transactions where id=p_id for update;
  if not found or tx.claimed_at is null or tx.completed_at is not null or tx.expires_at<=now()
    or tx.identity_id is distinct from p_identity or tx.pending_kind is distinct from 'link' then raise exception 'SSO transaction unavailable'; end if;
  select * into identity from public.marketplace_sso_identities where id=p_identity for update;
  if not found or not identity.is_active or identity.app_user_id is not null then raise exception 'Identity unavailable'; end if;
  buyer:=identity.marketplace_user_id;
  if buyer is null then
    insert into public.marketplace_users(auth_user_id,username,email,first_name,last_name,role,is_active)
      values(null,'mp_'||replace(identity.id::text,'-',''),null,identity.display_name,null,'marketplace_user',true) returning id into buyer;
    update public.marketplace_sso_identities set marketplace_user_id=buyer where id=p_identity;
  else
    perform 1 from public.marketplace_users where id=buyer and is_active=true;
    if not found then raise exception 'Account unavailable'; end if;
  end if;
  update public.marketplace_sso_transactions set completed_at=now() where id=p_id;
  return buyer;
end $$;
revoke all on function public.create_marketplace_sso_buyer(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_marketplace_sso_buyer(uuid,uuid) to service_role;
create function public.prune_marketplace_sso_transactions() returns trigger language plpgsql set search_path='' as $$
begin delete from public.marketplace_sso_transactions where expires_at<now()-interval '1 day'; return null; end $$;
revoke all on function public.prune_marketplace_sso_transactions() from public,anon,authenticated;
create trigger prune_marketplace_sso_transactions before insert on public.marketplace_sso_transactions for each statement execute function public.prune_marketplace_sso_transactions();
-- Preserve existing Auth-owned workspaces; allow LINE-only buyers to own an isolated workspace.
alter table public.ekru_app_workspaces add column owner_marketplace_user_id uuid references public.marketplace_users(id) on delete restrict;
alter table public.ekru_app_workspaces drop constraint ekru_app_workspaces_check;
alter table public.ekru_app_workspaces add constraint ekru_app_workspaces_owner_check
  check(num_nonnulls(owner_auth_user_id,owner_marketplace_user_id,school_id)=1);
create unique index ekru_app_workspaces_marketplace_owner_key on public.ekru_app_workspaces(app_id,owner_marketplace_user_id) where owner_marketplace_user_id is not null;
commit;
