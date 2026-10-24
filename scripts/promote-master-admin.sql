-- Run manually in Supabase SQL Editor as the database administrator.
-- Replace the email below. Exactly one application profile must match.
-- If an email has multiple workspace profiles, use the intended profile's UUID
-- in target_profile_id as well. No PIN or password is changed.
begin;

do $$
declare
  target_email text := 'kittitorn.match@gmail.com';
  target_profile_id uuid := null;
  matched_ids uuid[];
  selected_user public.app_users%rowtype;
begin
  if target_email = 'CHANGE_ME@example.com' then
    raise exception 'Replace target_email before running this script';
  end if;

  select array_agg(u.id) into matched_ids
  from public.app_users u
  where (target_profile_id is null or u.id = target_profile_id)
    and (
      lower(u.email) = lower(trim(target_email))
      or lower(u.auth_login_email) = lower(trim(target_email))
      or exists (
        select 1 from auth.users a
        where a.id = u.auth_user_id
          and lower(a.email) = lower(trim(target_email))
      )
    );

  if coalesce(cardinality(matched_ids), 0) <> 1 then
    raise exception 'Expected exactly one profile, found %. Check email or set target_profile_id.',
      coalesce(cardinality(matched_ids), 0);
  end if;

  select * into strict selected_user
  from public.app_users where id = matched_ids[1] for update;

  update public.app_users
  set role = 'master_admin', auth_role = 'super_admin'
  where id = selected_user.id;

  raise notice 'Updated profile % (%) to master_admin. Sign out and sign in again.',
    selected_user.id, selected_user.username;
end
$$;

commit;
