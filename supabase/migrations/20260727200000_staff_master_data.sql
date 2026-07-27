-- School-scoped master data for staff profiles. Staff type codes are stored
-- in app_users.staff_type because they also key the permission preset.

create table if not exists public.staff_master_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  category text not null check (category in ('staff_type', 'position', 'academic_rank')),
  code text,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_master_items_name_not_blank check (btrim(name) <> ''),
  constraint staff_master_items_code_by_category check (
    (category = 'staff_type' and code is not null and btrim(code) <> '')
    or (category <> 'staff_type' and code is null)
  ),
  unique (school_id, category, name),
  unique (school_id, category, code)
);

create index if not exists staff_master_items_school_category_idx
  on public.staff_master_items (school_id, category, is_active, sort_order);

alter table public.staff_master_items enable row level security;

create or replace function public.handle_staff_master_item_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_staff_master_items_updated_at
  on public.staff_master_items;
create trigger set_staff_master_items_updated_at
  before update on public.staff_master_items
  for each row execute function public.handle_staff_master_item_updated_at();

-- Custom staff types are now allowed. The six built-in codes remain special
-- only in application behavior (for example executive approval defaults).
alter table public.app_users
  drop constraint if exists app_users_staff_type_check;
alter table public.staff_type_permissions
  drop constraint if exists staff_type_permissions_staff_type_check;

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
    sort_order,
    is_system
  )
  select target_school_id, preset.category, preset.code, preset.name, preset.sort_order, true
  from (
    values
      ('staff_type', 'executive', 'ผู้บริหาร', 10),
      ('staff_type', 'teacher', 'ครูผู้สอน', 20),
      ('staff_type', 'contract_teacher', 'ครูอัตราจ้าง', 30),
      ('staff_type', 'government_employee', 'พนักงานราชการ', 40),
      ('staff_type', 'administrative_officer', 'เจ้าหน้าที่ธุรการ', 50),
      ('staff_type', 'janitor', 'นักการภารโรง', 60),
      ('position', null, 'ผู้อำนวยการโรงเรียน', 10),
      ('position', null, 'รองผู้อำนวยการโรงเรียน', 20),
      ('position', null, 'ครู', 30),
      ('position', null, 'ครูผู้ช่วย', 40),
      ('position', null, 'เจ้าหน้าที่ธุรการ', 50),
      ('position', null, 'นักการภารโรง', 60),
      ('academic_rank', null, 'ไม่มีวิทยฐานะ', 10),
      ('academic_rank', null, 'ครูผู้ช่วย', 20),
      ('academic_rank', null, 'ครูชำนาญการ (คศ.2)', 30),
      ('academic_rank', null, 'ครูชำนาญการพิเศษ (คศ.3)', 40),
      ('academic_rank', null, 'ครูเชี่ยวชาญ (คศ.4)', 50),
      ('academic_rank', null, 'ครูเชี่ยวชาญพิเศษ (คศ.5)', 60)
  ) as preset(category, code, name, sort_order)
  on conflict do nothing;
$$;

select public.seed_staff_master_items(id)
from public.schools;

-- Preserve any free-text values already used before master data existed.
insert into public.staff_master_items (school_id, category, code, name, sort_order)
select distinct school_id, 'staff_type', staff_type, staff_type, 999
from public.app_users
where role = 'teacher'
  and school_id is not null
  and staff_type is not null
on conflict do nothing;

insert into public.staff_master_items (school_id, category, name, sort_order)
select distinct school_id, 'position', btrim(position_title), 999
from public.app_users
where role = 'teacher'
  and school_id is not null
  and btrim(coalesce(position_title, '')) <> ''
on conflict do nothing;

insert into public.staff_master_items (school_id, category, name, sort_order)
select distinct school_id, 'academic_rank', btrim(academic_rank), 999
from public.app_users
where role = 'teacher'
  and school_id is not null
  and btrim(coalesce(academic_rank, '')) <> ''
on conflict do nothing;

create or replace function public.seed_staff_master_items_after_school_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_staff_master_items(new.id);
  return new;
end;
$$;

drop trigger if exists seed_staff_master_items_after_school_insert
  on public.schools;
create trigger seed_staff_master_items_after_school_insert
  after insert on public.schools
  for each row execute function public.seed_staff_master_items_after_school_insert();

revoke all on function public.seed_staff_master_items(uuid) from public;
revoke all on function public.seed_staff_master_items_after_school_insert() from public;
revoke all on function public.handle_staff_master_item_updated_at() from public;
