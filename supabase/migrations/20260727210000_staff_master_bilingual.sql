-- Add an optional English display name while keeping `name` as the Thai
-- canonical value referenced by existing staff profile text fields.

alter table public.staff_master_items
  add column if not exists name_en text;

alter table public.staff_master_items
  drop constraint if exists staff_master_items_name_en_not_blank;
alter table public.staff_master_items
  add constraint staff_master_items_name_en_not_blank
  check (name_en is null or btrim(name_en) <> '');

create unique index if not exists staff_master_items_name_en_unique_idx
  on public.staff_master_items (school_id, category, lower(name_en))
  where name_en is not null;

update public.staff_master_items
set name_en = case
  when category = 'staff_type' and code = 'executive' then 'Executive'
  when category = 'staff_type' and code = 'teacher' then 'Teacher'
  when category = 'staff_type' and code = 'contract_teacher' then 'Contract Teacher'
  when category = 'staff_type' and code = 'government_employee' then 'Government Employee'
  when category = 'staff_type' and code = 'administrative_officer' then 'Administrative Officer'
  when category = 'staff_type' and code = 'janitor' then 'Janitor'
  when category = 'position' and name = 'ผู้อำนวยการโรงเรียน' then 'School Director'
  when category = 'position' and name = 'รองผู้อำนวยการโรงเรียน' then 'Deputy School Director'
  when category = 'position' and name = 'ครู' then 'Teacher'
  when category = 'position' and name = 'ครูผู้ช่วย' then 'Assistant Teacher'
  when category = 'position' and name = 'เจ้าหน้าที่ธุรการ' then 'Administrative Officer'
  when category = 'position' and name = 'นักการภารโรง' then 'Janitor'
  when category = 'academic_rank' and name = 'ไม่มีวิทยฐานะ' then 'No Academic Rank'
  when category = 'academic_rank' and name = 'ครูผู้ช่วย' then 'Assistant Teacher'
  when category = 'academic_rank' and name = 'ครูชำนาญการ (คศ.2)' then 'Professional Level Teacher (K 2)'
  when category = 'academic_rank' and name = 'ครูชำนาญการพิเศษ (คศ.3)' then
    'Senior Professional Level Teacher (K 3)'
  when category = 'academic_rank' and name = 'ครูเชี่ยวชาญ (คศ.4)' then
    'Expert Level Teacher (K 4)'
  when category = 'academic_rank' and name = 'ครูเชี่ยวชาญพิเศษ (คศ.5)' then
    'Advisory Level Teacher (K 5)'
  else name_en
end
where is_system = true;

-- Keep the after-school-insert seed bilingual for schools created later.
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
    target_school_id,
    preset.category,
    preset.code,
    preset.name,
    preset.name_en,
    preset.sort_order,
    true
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
      )
  ) as preset(category, code, name, name_en, sort_order)
  on conflict do nothing;
$$;

revoke all on function public.seed_staff_master_items(uuid) from public;
