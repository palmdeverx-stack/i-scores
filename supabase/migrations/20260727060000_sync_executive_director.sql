-- "Executive" staff and the school-director permission are one designation.
-- Preserve directors created before staff employment types were introduced.

update public.app_users
set staff_type = 'executive'
where role = 'teacher' and is_school_director = true;

update public.app_users
set is_school_director = (role = 'teacher' and staff_type = 'executive');

alter table public.app_users
  add constraint app_users_executive_director_sync_check
  check (is_school_director = (role = 'teacher' and staff_type = 'executive'));
