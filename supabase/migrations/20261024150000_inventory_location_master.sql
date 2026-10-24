create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null check(length(btrim(name)) between 1 and 200),
  name_en text,
  sort_order integer not null default 0 check(sort_order >= 0),
  is_active boolean not null default true,
  unique(school_id,name)
);
alter table public.inventory_locations enable row level security;
insert into public.inventory_locations(school_id,name)
select distinct school_id,location from public.inventory_items where btrim(location) <> '';
alter table public.inventory_items alter column location drop not null;
alter table public.inventory_items alter column location set default null;
update public.inventory_items set location=null where btrim(location)='';
alter table public.inventory_items add constraint inventory_items_location_master_fkey
  foreign key(school_id,location) references public.inventory_locations(school_id,name)
  on update cascade on delete restrict;
