-- Reusable commercial plan templates managed by the master administrator.
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly', 'custom')),
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency text not null default 'THB',
  max_school_admins integer not null default 1 check (max_school_admins >= 0),
  max_teachers integer not null default 20 check (max_teachers >= 0),
  max_students integer not null default 500 check (max_students >= 0),
  enabled_features text[] not null default array[]::text[],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscription_plans_code_key
  on public.subscription_plans (lower(code));

drop trigger if exists set_subscription_plans_updated_at on public.subscription_plans;
create trigger set_subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.handle_updated_at ();

alter table public.subscription_plans enable row level security;

insert into public.subscription_plans (
  code, name, description, billing_cycle, price,
  max_school_admins, max_teachers, max_students, enabled_features, sort_order
)
values
(
  'STARTER',
  'Starter',
  'สำหรับโรงเรียนขนาดเล็ก',
  'monthly',
  1990,
  1,
  20,
  500,
  array[
    'admin.school_profile', 'admin.academic_years', 'admin.classrooms',
    'admin.subjects', 'admin.staff', 'admin.students',
    'admin.teacher_assignments', 'admin.enrollments',
    'teacher.assignments', 'teacher.students', 'teacher.timetable',
    'teacher.announcements', 'student.subjects', 'student.assignments',
    'student.attendance'
  ]::text[],
  10
),
(
  'PROFESSIONAL',
  'Professional',
  'ครบทุกฟีเจอร์สำหรับโรงเรียนทั่วไป',
  'monthly',
  4990,
  3,
  100,
  3000,
  array[
    'admin.school_profile', 'admin.academic_years', 'admin.classrooms',
    'admin.subjects', 'admin.staff', 'admin.students',
    'admin.teacher_assignments', 'admin.enrollments',
    'teacher.assignments', 'teacher.students', 'teacher.qr_attendance',
    'teacher.timetable', 'teacher.announcements', 'teacher.manage_classrooms',
    'teacher.manage_enrollments', 'student.subjects', 'student.assignments',
    'student.attendance', 'student.qr'
  ]::text[],
  20
),
(
  'ENTERPRISE',
  'Enterprise',
  'ไม่จำกัดจำนวนผู้ใช้และกำหนดราคาได้ตามสัญญา',
  'custom',
  0,
  0,
  0,
  0,
  array[
    'admin.school_profile', 'admin.academic_years', 'admin.classrooms',
    'admin.subjects', 'admin.staff', 'admin.students',
    'admin.teacher_assignments', 'admin.enrollments',
    'teacher.assignments', 'teacher.students', 'teacher.qr_attendance',
    'teacher.timetable', 'teacher.announcements', 'teacher.manage_classrooms',
    'teacher.manage_enrollments', 'student.subjects', 'student.assignments',
    'student.attendance', 'student.qr'
  ]::text[],
  30
)
on conflict do nothing;
