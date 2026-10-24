alter table public.inventory_categories
  add column name_en text,
  add column sort_order integer not null default 0 check(sort_order >= 0),
  add column is_active boolean not null default true;
alter table public.inventory_units
  add column name_en text,
  add column sort_order integer not null default 0 check(sort_order >= 0),
  add column is_active boolean not null default true;
