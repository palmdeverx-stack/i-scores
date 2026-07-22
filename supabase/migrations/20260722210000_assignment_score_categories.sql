-- Score categories: classify assignments so teachers can manage
-- งาน / แบบทดสอบ / กลางภาค / ปลายภาค / อื่นๆ separately under "จัดการคะแนน".
-- Midterm and final are singleton per teacher_assignment (one score per student).

alter table public.assignments
  add column category text not null default 'assignment'
    check (category in ('assignment', 'quiz', 'midterm', 'final', 'other'));

create unique index assignments_one_midterm_per_teacher_assignment
  on public.assignments (teacher_assignment_id)
  where category = 'midterm';

create unique index assignments_one_final_per_teacher_assignment
  on public.assignments (teacher_assignment_id)
  where category = 'final';
