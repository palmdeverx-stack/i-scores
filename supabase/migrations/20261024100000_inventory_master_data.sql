-- Reusable school-scoped categories and units; preserve existing item labels.
create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null check(length(btrim(name)) between 1 and 100),
  unique(school_id, name)
);
create table public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null check(length(btrim(name)) between 1 and 40),
  unique(school_id, name)
);
alter table public.inventory_categories enable row level security;
alter table public.inventory_units enable row level security;
update public.inventory_items set category='ไม่ระบุหมวดหมู่' where btrim(category)='';
insert into public.inventory_categories(school_id, name)
select distinct school_id, category from public.inventory_items;
insert into public.inventory_units(school_id, name)
select distinct school_id, unit from public.inventory_items;
insert into public.inventory_categories(school_id,name)
select s.id, v.name from public.schools s cross join
(values ('วัสดุสำนักงาน'), ('วัสดุการศึกษา'), ('วัสดุคอมพิวเตอร์'), ('วัสดุงานบ้าน')) v(name)
on conflict(school_id,name) do nothing;
insert into public.inventory_units(school_id,name)
select s.id, v.name from public.schools s cross join
(values ('ชิ้น'), ('อัน'), ('กล่อง'), ('แพ็ค'), ('รีม'), ('ชุด')) v(name)
on conflict(school_id,name) do nothing;
alter table public.inventory_items
  add constraint inventory_items_category_master_fkey foreign key(school_id,category)
    references public.inventory_categories(school_id,name) on update cascade on delete restrict,
  add constraint inventory_items_unit_master_fkey foreign key(school_id,unit)
    references public.inventory_units(school_id,name) on update cascade on delete restrict;
