-- School-scoped name prefixes for teacher and staff profiles.

alter table public.staff_master_items
  drop constraint if exists staff_master_items_category_check,
  add constraint staff_master_items_category_check
    check (category in ('staff_type', 'prefix', 'position', 'academic_rank', 'employment_status'));

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
      ('prefix', null, 'นาย', 'Mr.', 10),
      ('prefix', null, 'นาง', 'Mrs.', 20),
      ('prefix', null, 'นางสาว', 'Ms.', 30),
      ('prefix', null, 'ดร.', 'Dr.', 40),
      ('position', null, 'ผู้อำนวยการโรงเรียน', 'School Director', 10),
      ('position', null, 'รองผู้อำนวยการโรงเรียน', 'Deputy School Director', 20),
      ('position', null, 'ครู', 'Teacher', 30),
      ('position', null, 'ครูผู้ช่วย', 'Assistant Teacher', 40),
      ('position', null, 'เจ้าหน้าที่ธุรการ', 'Administrative Officer', 50),
      ('position', null, 'นักการภารโรง', 'Janitor', 60),
      ('academic_rank', null, 'ไม่มีวิทยฐานะ', 'No Academic Rank', 10),
      ('academic_rank', null, 'ครูผู้ช่วย', 'Assistant Teacher', 20),
      ('academic_rank', null, 'ครูชำนาญการ (คศ.2)', 'Professional Level Teacher (K 2)', 30),
      ('academic_rank', null, 'ครูชำนาญการพิเศษ (คศ.3)', 'Senior Professional Level Teacher (K 3)', 40),
      ('academic_rank', null, 'ครูเชี่ยวชาญ (คศ.4)', 'Expert Level Teacher (K 4)', 50),
      ('academic_rank', null, 'ครูเชี่ยวชาญพิเศษ (คศ.5)', 'Advisory Level Teacher (K 5)', 60),
      ('employment_status', 'active', 'ปฏิบัติงาน', 'Active', 10),
      ('employment_status', 'study_leave', 'ลาศึกษาต่อ', 'Study Leave', 20),
      ('employment_status', 'leave', 'ลาพัก', 'On Leave', 30),
      ('employment_status', 'retired', 'เกษียณ', 'Retired', 40),
      ('employment_status', 'terminated', 'พ้นสภาพ', 'Terminated', 50)
  ) as preset(category, code, name, name_en, sort_order)
  on conflict do nothing;
$$;

select public.seed_staff_master_items(id) from public.schools;

insert into public.staff_master_items (school_id, category, name, name_en, sort_order)
select distinct school_id, 'prefix', btrim(name_prefix), null, 999
from public.app_users
where role = 'teacher'
  and school_id is not null
  and btrim(coalesce(name_prefix, '')) <> ''
on conflict do nothing;

revoke all on function public.seed_staff_master_items(uuid) from public;
