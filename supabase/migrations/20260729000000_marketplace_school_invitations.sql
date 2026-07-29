-- Shared Marketplace identities and school invitations.
-- Marketplace users register first, then a school administrator can invite
-- their registered email into the administrator's own school.

create table if not exists public.marketplace_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'marketplace_user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketplace_users_email_key
  on public.marketplace_users (lower(email));

create table if not exists public.marketplace_school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  marketplace_user_id uuid not null references public.marketplace_users(id) on delete cascade,
  membership_role text not null default 'teacher'
    check (membership_role in ('school_admin', 'academic_admin', 'teacher')),
  joined_at timestamptz not null default now(),
  unique (school_id, marketplace_user_id)
);

create table if not exists public.marketplace_school_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  marketplace_user_id uuid not null references public.marketplace_users(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.app_users(id) on delete restrict,
  membership_role text not null default 'teacher'
    check (membership_role in ('school_admin', 'academic_admin', 'teacher')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, marketplace_user_id)
);

create index if not exists marketplace_school_invitations_school_idx
  on public.marketplace_school_invitations (school_id, created_at desc);

alter table public.marketplace_users enable row level security;
alter table public.marketplace_school_members enable row level security;
alter table public.marketplace_school_invitations enable row level security;

drop trigger if exists set_marketplace_users_updated_at on public.marketplace_users;
create trigger set_marketplace_users_updated_at
  before update on public.marketplace_users
  for each row execute function public.handle_updated_at();

drop trigger if exists set_marketplace_school_invitations_updated_at
  on public.marketplace_school_invitations;
create trigger set_marketplace_school_invitations_updated_at
  before update on public.marketplace_school_invitations
  for each row execute function public.handle_updated_at();

-- Called by the Marketplace application after the signed-in recipient opens
-- the invitation link. The raw token is never stored in the database.
create or replace function public.accept_marketplace_school_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_marketplace_user_id uuid;
  invitation_record public.marketplace_school_invitations%rowtype;
begin
  select id
  into current_marketplace_user_id
  from public.marketplace_users
  where auth_user_id = auth.uid();

  if current_marketplace_user_id is null then
    raise exception 'Marketplace account not found';
  end if;

  select *
  into invitation_record
  from public.marketplace_school_invitations
  where marketplace_user_id = current_marketplace_user_id
    and token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if invitation_record.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  insert into public.marketplace_school_members (
    school_id,
    marketplace_user_id,
    membership_role
  )
  values (
    invitation_record.school_id,
    invitation_record.marketplace_user_id,
    invitation_record.membership_role
  )
  on conflict (school_id, marketplace_user_id)
  do update set membership_role = excluded.membership_role;

  update public.marketplace_school_invitations
  set accepted_at = now()
  where id = invitation_record.id;

  return invitation_record.school_id;
end;
$$;

revoke all on function public.accept_marketplace_school_invitation(text) from public;
grant execute on function public.accept_marketplace_school_invitation(text) to authenticated;
