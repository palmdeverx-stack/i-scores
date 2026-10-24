-- School inventory: all writes go through authenticated server routes.
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  code text not null check (length(btrim(code)) between 1 and 60),
  name text not null check (length(btrim(name)) between 1 and 200),
  category text not null default '',
  unit text not null check (length(btrim(unit)) between 1 and 40),
  location text not null default '',
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  unique(school_id, code),
  unique(school_id, id)
);
create table public.inventory_movements (
  id uuid primary key,
  school_id uuid not null references public.schools(id),
  item_id uuid not null,
  kind text not null check (kind in ('receive','issue')),
  quantity integer not null check (quantity > 0),
  recipient text not null default '',
  note text not null default '',
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  foreign key(school_id, item_id) references public.inventory_items(school_id, id)
);
create index inventory_movements_school_date on public.inventory_movements(school_id, created_at desc);
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Row locking prevents concurrent issues from taking stock below zero.
-- A client-generated movement UUID makes retries safe.
create function public.record_inventory_movement(
  p_id uuid, p_school uuid, p_item uuid, p_kind text, p_quantity integer,
  p_recipient text, p_note text, p_actor uuid
) returns void language plpgsql set search_path = public as $$
declare stock integer; previous public.inventory_movements%rowtype;
begin
  if p_kind not in ('receive','issue') or p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid movement';
  end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then
    raise exception 'Invalid actor';
  end if;
  select quantity into stock from inventory_items where id=p_item and school_id=p_school for update;
  if not found then raise exception 'Item not found'; end if;
  select * into previous from inventory_movements where id=p_id;
  if found then
    if previous.school_id=p_school and previous.item_id=p_item and previous.kind=p_kind
      and previous.quantity=p_quantity and previous.created_by=p_actor
      and previous.recipient=p_recipient and previous.note=p_note then return; end if;
    raise exception 'Movement ID conflict';
  end if;
  if p_kind='issue' and stock<p_quantity then raise exception 'Insufficient stock'; end if;
  insert into inventory_movements(id,school_id,item_id,kind,quantity,recipient,note,created_by)
  values(p_id,p_school,p_item,p_kind,p_quantity,p_recipient,p_note,p_actor);
  update inventory_items set quantity=quantity + case when p_kind='receive' then p_quantity else -p_quantity end
  where id=p_item and school_id=p_school;
end $$;
revoke all on function public.record_inventory_movement(uuid,uuid,uuid,text,integer,text,text,uuid) from public, anon, authenticated;
grant execute on function public.record_inventory_movement(uuid,uuid,uuid,text,integer,text,text,uuid) to service_role;
