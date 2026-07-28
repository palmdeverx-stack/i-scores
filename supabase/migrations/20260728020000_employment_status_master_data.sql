-- Add "employment_status" (สถานะปฏิบัติงาน) as a fourth staff_master_items
-- category, same treatment as staff_type: schools get the 5 built-in
-- statuses seeded and may rename, reorder, deactivate, or add custom ones.
-- app_users.employment_status keeps storing the stable `code`.

alter table public.staff_master_items
  drop constraint if exists staff_master_items_category_check,
  add constraint staff_master_items_category_check
    check (category in ('staff_type', 'position', 'academic_rank', 'employment_status'));

alter table public.staff_master_items
  drop constraint if exists staff_master_items_code_by_category,
  add constraint staff_master_items_code_by_category
    check (
      (
        category in ('staff_type', 'employment_status')
        and code is not null and btrim(code) <> ''
      )
      or (category not in ('staff_type', 'employment_status') and code is null)
    );

-- Custom employment statuses are now allowed, same as staff types.
alter table public.app_users
  drop constraint if exists app_users_employment_status_check;

create or replace function public.seed_staff_master_items(target_school_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.staff_master_items (
    school_id,
    category,
    code,
    name,
    name_en,
    sort_order,
    is_system
  )
  select
    target_school_id, preset.category, preset.code, preset.name, preset.name_en,
    preset.sort_order, true
  from (
    values
      ('staff_type', 'executive', 'ผู้บริหาร', 'Executive', 10),
      ('staff_type', 'teacher', 'ครูผู้สอน', 'Teacher', 20),
      ('staff_type', 'contract_teacher', 'ครูอัตราจ้าง', 'Contract Teacher', 30),
      ('staff_type', 'government_employee', 'พนักงานราชการ', 'Government Employee', 40),
      ('staff_type', 'administrative_officer', 'เจ้าหน้าที่ธุรการ', 'Administrative Officer', 50),
      ('staff_type', 'janitor', 'นักการภารโรง', 'Janitor', 60),
      ('position', null, 'ผู้อำนวยการโรงเรียน', 'School Director', 10),
      ('position', null, 'รองผู้อำนวยการโรงเรียน', 'Deputy School Director', 20),
      ('position', null, 'ครู', 'Teacher', 30),
      ('position', null, 'ครูผู้ช่วย', 'Assistant Teacher', 40),
      ('position', null, 'เจ้าหน้าที่ธุรการ', 'Administrative Officer', 50),
      ('position', null, 'นักการภารโรง', 'Janitor', 60),
      ('academic_rank', null, 'ไม่มีวิทยฐานะ', 'No Academic Rank', 10),
      ('academic_rank', null, 'ครูผู้ช่วย', 'Assistant Teacher', 20),
      ('academic_rank', null, 'ครูชำนาญการ (คศ.2)', 'Professional Level Teacher (K 2)', 30),
      (
        'academic_rank',
        null,
        'ครูชำนาญการพิเศษ (คศ.3)',
        'Senior Professional Level Teacher (K 3)',
        40
      ),
      ('academic_rank', null, 'ครูเชี่ยวชาญ (คศ.4)', 'Expert Level Teacher (K 4)', 50),
      (
        'academic_rank',
        null,
        'ครูเชี่ยวชาญพิเศษ (คศ.5)',
        'Advisory Level Teacher (K 5)',
        60
      ),
      ('employment_status', 'active', 'ปฏิบัติงาน', 'Active', 10),
      ('employment_status', 'study_leave', 'ลาศึกษาต่อ', 'Study Leave', 20),
      ('employment_status', 'leave', 'ลาพัก', 'On Leave', 30),
      ('employment_status', 'retired', 'เกษียณ', 'Retired', 40),
      ('employment_status', 'terminated', 'พ้นสภาพ', 'Terminated', 50)
  ) as preset(category, code, name, name_en, sort_order)
  on conflict do nothing;
$$;

select public.seed_staff_master_items(id) from public.schools;

-- Preserve any employment_status values already in use as non-system items
-- too, in case a school's staff reference a code that predates the seed.
insert into public.staff_master_items (school_id, category, code, name, sort_order)
select distinct school_id, 'employment_status', employment_status, employment_status, 999
from public.app_users
where role = 'teacher'
  and school_id is not null
  and employment_status is not null
on conflict do nothing;

revoke all on function public.seed_staff_master_items(uuid) from public;
