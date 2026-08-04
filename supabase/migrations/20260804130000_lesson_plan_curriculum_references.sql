-- Keep lesson plans linked to the same curriculum objects used by templates.
-- Existing text columns remain immutable document snapshots for historical plans.

alter table public.lesson_plans
  add column if not exists subject_id uuid references public.subjects (id) on delete set null,
  add column if not exists grade_levels text[] not null default '{}',
  add column if not exists indicator_ids uuid[] not null default '{}';

update public.lesson_plans lesson_plan
set
  subject_id = assignment.subject_id,
  grade_levels = case
    when classroom.grade_level is null or btrim(classroom.grade_level) = '' then '{}'
    else array[classroom.grade_level]
  end
from public.teacher_assignments assignment
join public.classrooms classroom on classroom.id = assignment.classroom_id
where lesson_plan.teacher_assignment_id = assignment.id
  and lesson_plan.subject_id is null;

create index if not exists lesson_plans_subject_idx
  on public.lesson_plans (subject_id);
create index if not exists lesson_plans_indicator_ids_idx
  on public.lesson_plans using gin (indicator_ids);

comment on column public.lesson_plans.subject_id is
  'Canonical curriculum subject reference shared with templates.';
comment on column public.lesson_plans.indicator_ids is
  'Canonical curriculum indicator references; indicators text is the saved snapshot.';
