-- Generate codes atomically per school/category. Existing item codes stay intact.
alter table public.inventory_categories
  add column code_prefix text,
  add column last_code_number bigint not null default 0 check(last_code_number >= 0);

update public.inventory_categories set code_prefix = case name
  when 'วัสดุสำนักงาน' then 'OFF'
  when 'วัสดุการศึกษา' then 'EDU'
  when 'วัสดุคอมพิวเตอร์' then 'IT'
  when 'วัสดุงานบ้าน' then 'CLEAN'
  when 'วัสดุกีฬา' then 'SPORT'
  when 'วัสดุซ่อมบำรุง' then 'MAINT'
  when 'วัสดุวิทยาศาสตร์' then 'SCI'
  else null end;
with numbered as (
  select id, row_number() over(partition by school_id order by name,id) as number
  from public.inventory_categories where code_prefix is null
)
update public.inventory_categories c set code_prefix='CAT' || lpad(n.number::text,greatest(3,length(n.number::text)),'0')
from numbered n where c.id=n.id;
alter table public.inventory_categories alter column code_prefix set not null;
create unique index inventory_categories_school_prefix_key on public.inventory_categories(school_id, code_prefix);

create function public.set_inventory_category_prefix()
returns trigger language plpgsql set search_path = public as $$
declare next_number bigint;
begin
  -- Stable even if the category is renamed later.
  if new.code_prefix is null then
    new.code_prefix := case new.name
      when 'วัสดุสำนักงาน' then 'OFF' when 'วัสดุการศึกษา' then 'EDU'
      when 'วัสดุคอมพิวเตอร์' then 'IT' when 'วัสดุงานบ้าน' then 'CLEAN'
      when 'วัสดุกีฬา' then 'SPORT' when 'วัสดุซ่อมบำรุง' then 'MAINT'
      when 'วัสดุวิทยาศาสตร์' then 'SCI'
      else null end;
    -- Serialize prefix allocation for new categories within this school.
    perform 1 from schools where id=new.school_id for update;
    if new.code_prefix is null or exists(select 1 from inventory_categories where school_id=new.school_id and code_prefix=new.code_prefix) then
      select coalesce(max(substring(code_prefix from 4)::bigint),0)+1 into next_number
      from inventory_categories where school_id=new.school_id and code_prefix ~ '^CAT[0-9]{1,12}$';
      new.code_prefix := 'CAT' || lpad(next_number::text,greatest(3,length(next_number::text)),'0');
    end if;
  end if;
  return new;
end $$;
create trigger inventory_category_auto_prefix before insert on public.inventory_categories
for each row execute function public.set_inventory_category_prefix();

create function public.assign_inventory_item_code()
returns trigger language plpgsql set search_path = public as $$
declare category_row public.inventory_categories%rowtype; latest bigint; candidate text;
begin
  if new.code is not null and btrim(new.code) <> '' then return new; end if;
  -- Serialize only writers for this category, and keep the counter update in
  -- the same transaction as the item insert so failed inserts cannot consume it.
  select * into category_row from inventory_categories
    where school_id=new.school_id and name=new.category for update;
  if not found then raise exception 'Inventory category not found'; end if;
  select coalesce(max(substring(code from length(category_row.code_prefix)+2)::bigint),0)
    into latest from inventory_items
    where school_id=new.school_id
      and starts_with(code, category_row.code_prefix || '-')
      and substring(code from length(category_row.code_prefix)+2) ~ '^[0-9]{1,12}$';
  latest := greatest(category_row.last_code_number,latest) + 1;
  loop
    candidate := category_row.code_prefix || '-' || lpad(latest::text,greatest(3,length(latest::text)),'0');
    exit when not exists(select 1 from inventory_items where school_id=new.school_id and code=candidate);
    latest := latest + 1;
  end loop;
  update inventory_categories set last_code_number=latest where id=category_row.id;
  new.code := candidate;
  return new;
end $$;
create trigger inventory_item_auto_code before insert on public.inventory_items
for each row execute function public.assign_inventory_item_code();
