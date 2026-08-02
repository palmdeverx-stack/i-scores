-- One Supabase identity can own a personal workspace and belong to one or more
-- schools. Authorization remains workspace-specific through separate app_users
-- profiles, while authentication remains shared through auth_user_id.

drop index if exists public.app_users_auth_user_id_key;
drop index if exists public.app_users_auth_login_email_key;

create unique index if not exists app_users_auth_user_workspace_key
  on public.app_users (
    auth_user_id,
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where auth_user_id is not null;

create unique index if not exists app_users_auth_email_workspace_key
  on public.app_users (
    lower(auth_login_email),
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where auth_login_email is not null;

-- Link an existing staff record first when the school invited an email that
-- was already present in its directory.
update public.app_users au
set
  auth_user_id = mu.auth_user_id,
  auth_login_email = mu.email,
  auth_role = msm.membership_role,
  auth_migrated_at = coalesce(au.auth_migrated_at, now()),
  is_active = true
from public.marketplace_school_members msm
join public.marketplace_users mu on mu.id = msm.marketplace_user_id
join public.schools s on s.id = msm.school_id and s.workspace_type = 'school'
where au.school_id = msm.school_id
  and lower(au.email) = lower(mu.email)
  and au.role <> 'student'
  and au.auth_user_id is null;

-- Existing accepted invitations predate workspace-specific app profiles.
insert into public.app_users (
  username,
  password_hash,
  email,
  first_name,
  last_name,
  role,
  school_id,
  is_active,
  auth_user_id,
  auth_login_email,
  auth_role,
  auth_migrated_at
)
select
  'member_' || replace(mu.auth_user_id::text, '-', '') || '_' || replace(msm.school_id::text, '-', ''),
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  mu.email,
  mu.first_name,
  mu.last_name,
  case when msm.membership_role = 'school_admin' then 'school_admin' else 'teacher' end,
  msm.school_id,
  true,
  mu.auth_user_id,
  mu.email,
  msm.membership_role,
  now()
from public.marketplace_school_members msm
join public.marketplace_users mu on mu.id = msm.marketplace_user_id
join public.schools s on s.id = msm.school_id and s.workspace_type = 'school'
where not exists (
  select 1
  from public.app_users au
  where au.auth_user_id = mu.auth_user_id
    and au.school_id = msm.school_id
);

create or replace function public.accept_marketplace_school_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_marketplace_user public.marketplace_users%rowtype;
  invitation_record public.marketplace_school_invitations%rowtype;
  generated_username text;
begin
  select *
  into current_marketplace_user
  from public.marketplace_users
  where auth_user_id = auth.uid();

  if current_marketplace_user.id is null then
    raise exception 'Marketplace account not found';
  end if;

  select *
  into invitation_record
  from public.marketplace_school_invitations
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and lower(invited_email) = lower(current_marketplace_user.email)
    and (
      marketplace_user_id is null
      or marketplace_user_id = current_marketplace_user.id
    )
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if invitation_record.id is null then
    raise exception 'Invitation is invalid, expired, or belongs to another email';
  end if;

  insert into public.marketplace_school_members (
    school_id,
    marketplace_user_id,
    membership_role
  )
  values (
    invitation_record.school_id,
    current_marketplace_user.id,
    invitation_record.membership_role
  )
  on conflict (school_id, marketplace_user_id)
  do update set membership_role = excluded.membership_role;

  if not exists (
    select 1
    from public.app_users
    where auth_user_id = current_marketplace_user.auth_user_id
      and school_id = invitation_record.school_id
  ) then
    update public.app_users
    set
      auth_user_id = current_marketplace_user.auth_user_id,
      auth_login_email = current_marketplace_user.email,
      auth_role = invitation_record.membership_role,
      auth_migrated_at = coalesce(auth_migrated_at, now()),
      is_active = true
    where id = (
      select id
      from public.app_users
      where school_id = invitation_record.school_id
        and lower(email) = lower(current_marketplace_user.email)
        and role <> 'student'
        and auth_user_id is null
      order by created_at
      limit 1
    );
  end if;

  if not exists (
    select 1
    from public.app_users
    where auth_user_id = current_marketplace_user.auth_user_id
      and school_id = invitation_record.school_id
  ) then
    generated_username := 'member_'
      || replace(current_marketplace_user.auth_user_id::text, '-', '')
      || '_'
      || replace(invitation_record.school_id::text, '-', '');

    insert into public.app_users (
      username,
      password_hash,
      email,
      first_name,
      last_name,
      role,
      school_id,
      is_active,
      auth_user_id,
      auth_login_email,
      auth_role,
      auth_migrated_at
    )
    values (
      generated_username,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      current_marketplace_user.email,
      current_marketplace_user.first_name,
      current_marketplace_user.last_name,
      case when invitation_record.membership_role = 'school_admin' then 'school_admin' else 'teacher' end,
      invitation_record.school_id,
      true,
      current_marketplace_user.auth_user_id,
      current_marketplace_user.email,
      invitation_record.membership_role,
      now()
    );
  else
    update public.app_users
    set
      role = case when invitation_record.membership_role = 'school_admin' then 'school_admin' else 'teacher' end,
      auth_role = invitation_record.membership_role,
      is_active = true
    where auth_user_id = current_marketplace_user.auth_user_id
      and school_id = invitation_record.school_id;
  end if;

  update public.marketplace_school_invitations
  set
    marketplace_user_id = current_marketplace_user.id,
    accepted_at = now()
  where id = invitation_record.id;

  return invitation_record.school_id;
end;
$$;

revoke all on function public.accept_marketplace_school_invitation(text) from public;
grant execute on function public.accept_marketplace_school_invitation(text) to authenticated;

-- Patch the already-deployed personal provisioning function so add-on purchases
-- always resolve the personal profile instead of assuming one profile per identity.
do $$
declare
  function_sql text;
  updated_sql text;
begin
  select pg_get_functiondef(
    'public.provision_personal_workspace_purchase(uuid,uuid,text,text[],timestamptz,uuid)'::regprocedure
  ) into function_sql;

  updated_sql := replace(
    function_sql,
    'where auth_user_id = p_buyer_auth_user_id;',
    E'where auth_user_id = p_buyer_auth_user_id\n    and school_id = p_school_id;'
  );
  updated_sql := replace(
    updated_sql,
    E'  if app_user_record.id is not null\n    and app_user_record.school_id is not null\n    and app_user_record.school_id <> p_school_id then\n    raise exception ''Buyer is already linked to another workspace'';\n  end if;\n',
    ''
  );

  if updated_sql <> function_sql then
    execute updated_sql;
  end if;
end;
$$;
