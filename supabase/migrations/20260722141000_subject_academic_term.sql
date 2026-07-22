-- Each subject row represents a subject offering in one academic term.
alter table public.subjects
  add column if not exists academic_year_id uuid references public.academic_years (id) on delete cascade,
  add column if not exists semester_id uuid references public.semesters (id) on delete cascade;

-- A subject name/code can be reused in another term, but not duplicated
-- within the same term.
alter table public.subjects
  drop constraint if exists subjects_school_id_name_key;

-- Preserve historical assignments. If one legacy subject was used in several
-- semesters, clone it per semester and repoint each assignment to the matching
-- clone. The earliest term keeps the original subject id.
create temporary table subject_term_migration as
with used_terms as (
  select
    assignment.subject_id,
    assignment.semester_id,
    semester.academic_year_id,
    min(assignment.created_at) as first_used_at
  from public.teacher_assignments assignment
  join public.semesters semester on semester.id = assignment.semester_id
  group by assignment.subject_id, assignment.semester_id, semester.academic_year_id
), numbered_terms as (
  select
    used_terms.*,
    row_number() over (
      partition by used_terms.subject_id
      order by used_terms.first_used_at, used_terms.semester_id
    ) as term_number
  from used_terms
)
select
  subject_id as old_subject_id,
  semester_id,
  academic_year_id,
  term_number,
  case when term_number = 1 then subject_id else gen_random_uuid() end as target_subject_id
from numbered_terms;

update public.subjects subject
set
  semester_id = term.semester_id,
  academic_year_id = term.academic_year_id
from subject_term_migration term
where subject.id = term.old_subject_id
  and term.term_number = 1
  and subject.semester_id is null;

insert into public.subjects (
  id,
  school_id,
  code,
  name,
  credits,
  description,
  image_url,
  academic_year_id,
  semester_id,
  created_at,
  updated_at
)
select
  term.target_subject_id,
  subject.school_id,
  subject.code,
  subject.name,
  subject.credits,
  subject.description,
  subject.image_url,
  term.academic_year_id,
  term.semester_id,
  subject.created_at,
  subject.updated_at
from subject_term_migration term
join public.subjects subject on subject.id = term.old_subject_id
where term.term_number > 1;

update public.teacher_assignments assignment
set subject_id = term.target_subject_id
from subject_term_migration term
where assignment.subject_id = term.old_subject_id
  and assignment.semester_id = term.semester_id
  and assignment.subject_id <> term.target_subject_id;

drop table subject_term_migration;

create unique index if not exists subjects_semester_name_key
  on public.subjects (semester_id, lower(name))
  where semester_id is not null;

create unique index if not exists subjects_semester_code_key
  on public.subjects (semester_id, lower(code))
  where semester_id is not null and code is not null;

create index if not exists subjects_academic_year_id_idx
  on public.subjects (academic_year_id);
