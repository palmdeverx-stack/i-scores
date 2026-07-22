-- Add username-based login and student/instructor/admin roles

alter table public.profiles
  add column username text;

create unique index profiles_username_key on public.profiles (lower(username));

alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  alter column role set default 'student';

update public.profiles set role = 'student' where role = 'user';

alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'instructor', 'admin'));

-- Recreate handle_new_user to also persist the username chosen at sign-up
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, first_name, last_name, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end;
$$;

-- Let any authenticated user resolve a username to its email, needed for username-based sign-in.
-- Runs as the function owner (bypasses RLS) but only ever returns the email column.
create or replace function public.email_for_username (lookup_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(lookup_username) limit 1;
$$;

revoke all on function public.email_for_username (text) from public;
grant execute on function public.email_for_username (text) to anon, authenticated;
