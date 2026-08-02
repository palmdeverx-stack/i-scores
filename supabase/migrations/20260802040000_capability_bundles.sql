-- Reusable, versioned feature templates. Subscription plans keep their own
-- enabled_features snapshot, so editing a bundle never changes sold plans.

create table if not exists public.capability_bundles (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  target_scope text not null default 'both'
    check (target_scope in ('individual', 'school', 'both')),
  version integer not null default 1 check (version > 0),
  feature_keys text[] not null default array[]::text[],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists capability_bundles_code_key
  on public.capability_bundles (lower(code));

drop trigger if exists set_capability_bundles_updated_at on public.capability_bundles;
create trigger set_capability_bundles_updated_at
  before update on public.capability_bundles
  for each row execute function public.handle_updated_at ();

alter table public.capability_bundles enable row level security;

alter table public.subscription_plans
  add column if not exists source_bundles jsonb not null default '[]'::jsonb;

alter table public.subscription_plans
  drop constraint if exists subscription_plans_source_bundles_array_check;

alter table public.subscription_plans
  add constraint subscription_plans_source_bundles_array_check
  check (jsonb_typeof(source_bundles) = 'array');

insert into public.capability_bundles
  (code, name, description, target_scope, feature_keys, sort_order)
values
  (
    'CLASSROOM_CORE',
    'จัดการชั้นเรียน',
    'ปีการศึกษา ห้องเรียน รายวิชา และการจัดผู้เรียนเข้าชั้นเรียน',
    'both',
    array[
      'admin.academic_years', 'admin.classrooms', 'admin.subjects',
      'admin.students', 'admin.enrollments', 'teacher.manage_subjects',
      'teacher.manage_classrooms', 'teacher.manage_enrollments'
    ]::text[],
    10
  ),
  (
    'TEACHING',
    'การสอน งาน และคะแนน',
    'วิชาที่สอน งาน แบบทดสอบ คะแนน และข้อมูลผู้เรียน',
    'both',
    array[
      'teacher.assignments', 'teacher.students', 'teacher.timetable',
      'student.subjects', 'student.assignments'
    ]::text[],
    20
  ),
  (
    'ATTENDANCE',
    'เช็กชื่อและเวลาเรียน',
    'QR เช็กชื่อ ประวัติการเข้าเรียน และ QR ประจำตัวผู้เรียน',
    'both',
    array[
      'teacher.qr_attendance', 'student.attendance', 'student.qr'
    ]::text[],
    30
  ),
  (
    'ACADEMIC_WORKFLOW',
    'งานวิชาการและเอกสาร',
    'จัดตารางสอน รับรองผลการเรียน และจัดทำเอกสารการศึกษา',
    'school',
    array[
      'academic.schedule_workflow', 'academic.grade_workflow', 'academic.documents'
    ]::text[],
    40
  ),
  (
    'SCHOOL_MANAGEMENT',
    'บริหารโรงเรียน',
    'ข้อมูลโรงเรียน บุคลากร ฝ่าย สิทธิ์ และประกาศส่วนกลาง',
    'school',
    array[
      'admin.school_profile', 'admin.staff', 'admin.teacher_assignments',
      'admin.announcements', 'admin.departments', 'admin.access_permissions',
      'admin.staff_masters', 'teacher.announcements'
    ]::text[],
    50
  ),
  (
    'WORKSHEET_AI',
    'Worksheet AI',
    'สร้างใบงานและสื่อการเรียนรู้ด้วย AI',
    'individual',
    array['teacher.worksheet_ai']::text[],
    60
  )
on conflict do nothing;

comment on table public.capability_bundles is
  'Versioned templates used to select features; subscription_plans.enabled_features remains authoritative.';

comment on column public.subscription_plans.source_bundles is
  'Bundle snapshots applied to this plan: id, code, name, version, and featureKeys.';
