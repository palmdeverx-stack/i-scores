-- Lets a department be granted the ability to schedule teaching periods for
-- every teacher in the school (organized by classroom), and lets that
-- capability be delegated to specific members rather than the whole department.

alter table public.departments
  add column can_manage_timetable boolean not null default false;

alter table public.department_members
  add column can_manage_timetable boolean not null default false;
