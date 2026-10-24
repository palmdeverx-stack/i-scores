-- Run in Supabase SQL Editor. Set username, password and contact email below.
-- Creates a NEW application account; existing accounts are not modified.
-- Supabase Auth is linked automatically on the first username/password login.
-- PIN is shared by all master_admin accounts and MUST be configured separately:
-- set MASTER_ADMIN_PIN to 8 digits in the running server environment, then restart.
begin;

set local search_path = public, extensions;

do $$
declare
  new_username text := 'master_admin_new';
  new_password text := 'CHANGE_ME_TO_A_NEW_PASSWORD';
  contact_email text := 'kittitorn.match@gmail.com';
  created_id uuid;
begin
  if new_password = 'CHANGE_ME_TO_A_NEW_PASSWORD'
     or length(new_password) < 12
     or octet_length(new_password) > 72 then
    raise exception 'Set a new password of at least 12 characters and at most 72 bytes';
  end if;

  if new_username !~ '^[A-Za-z0-9_.-]{3,64}$' then
    raise exception 'Username must be 3-64 letters, digits, dots, underscores or hyphens';
  end if;

  if exists (
    select 1 from public.app_users where lower(username) = lower(new_username)
  ) then
    raise exception 'Username already exists. Choose a new username.';
  end if;

  insert into public.app_users (
    username, password_hash, email, role, auth_role, school_id,
    is_active, must_change_password
  ) values (
    new_username, crypt(new_password, gen_salt('bf', 12)),
    contact_email, 'master_admin', 'super_admin', null, true, false
  ) returning id into created_id;

  raise notice 'Created master_admin profile % with username %. Sign in using username/password.',
    created_id, new_username;
end
$$;

commit;
