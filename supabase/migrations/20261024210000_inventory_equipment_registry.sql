-- Existing records remain consumable materials until explicitly reclassified.
alter table public.inventory_items
  add column item_type text not null default 'material' check(item_type in ('material','equipment')),
  add column material_subtype text default 'consumable',
  add constraint inventory_item_type_subtype_check check(
    (item_type='material' and material_subtype='consumable' and material_subtype is not null)
    or (item_type='equipment' and material_subtype is null)
  );
create table public.inventory_assets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  item_id uuid not null,
  receipt_movement_id uuid not null references public.inventory_movements(id),
  asset_code text not null check(length(btrim(asset_code)) between 1 and 100),
  serial_number text not null default '',
  acquisition_date date not null,
  acquisition_cost numeric(14,2) not null default 0 check(acquisition_cost>=0),
  status text not null default 'registered' check(status in ('registered','in_use')),
  custodian text not null default '',
  location text,
  notes text not null default '',
  registered_by uuid not null references public.app_users(id),
  registered_at timestamptz not null default now(),
  activated_by uuid references public.app_users(id),
  activated_at timestamptz,
  unique(school_id,asset_code),
  foreign key(school_id,item_id) references public.inventory_items(school_id,id),
  foreign key(school_id,location) references public.inventory_locations(school_id,name) on update cascade on delete restrict
);
alter table public.inventory_assets enable row level security;
create index inventory_assets_school_item on public.inventory_assets(school_id,item_id);
create index inventory_assets_receipt on public.inventory_assets(receipt_movement_id);

create function public.protect_inventory_item_type() returns trigger language plpgsql set search_path=public as $$
begin
  if new.item_type is distinct from old.item_type and exists(select 1 from inventory_assets where school_id=old.school_id and item_id=old.id) then
    raise exception 'Registered equipment type cannot be changed';
  end if;
  return new;
end $$;
create trigger inventory_item_protect_type before update on public.inventory_items for each row execute function public.protect_inventory_item_type();

create function public.inventory_asset_receipts(p_school uuid,p_item uuid)
returns table(movement_id uuid,received_at timestamptz,quantity integer,registered_count bigint)
language sql stable set search_path=public as $$
  select m.id,m.created_at,m.quantity,(select count(*) from inventory_assets a where a.receipt_movement_id=m.id)
  from inventory_movements m join inventory_items i on i.id=m.item_id and i.school_id=m.school_id
  where m.school_id=p_school and m.item_id=p_item and m.kind='receive' and i.item_type='equipment'
  order by m.created_at desc;
$$;
create function public.register_inventory_asset(
  p_id uuid,p_school uuid,p_actor uuid,p_item uuid,p_receipt uuid,p_code text,p_serial text,p_date date,p_cost numeric,p_notes text
) returns uuid language plpgsql set search_path=public as $$
declare item public.inventory_items%rowtype; receipt public.inventory_movements%rowtype; previous public.inventory_assets%rowtype;
begin
  if p_code is null or length(btrim(p_code)) not between 1 and 100 or p_serial is null or length(p_serial)>200 or p_date is null or p_cost is null or p_cost<0 or p_cost>999999999999.99 or p_notes is null or length(p_notes)>2000 then raise exception 'Invalid asset'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into item from inventory_items where id=p_item and school_id=p_school for update;
  if not found or item.item_type<>'equipment' then raise exception 'Equipment item required'; end if;
  select * into previous from inventory_assets where id=p_id;
  if found then
    if previous.school_id=p_school and previous.item_id=p_item and previous.receipt_movement_id=p_receipt and previous.asset_code=p_code and previous.serial_number=p_serial and previous.acquisition_date=p_date and previous.acquisition_cost=p_cost and previous.notes=p_notes and previous.registered_by=p_actor then return p_id; end if;
    raise exception 'Asset ID conflict';
  end if;
  select * into receipt from inventory_movements where id=p_receipt and school_id=p_school and item_id=p_item and kind='receive';
  if not found then raise exception 'Receipt not found'; end if;
  if (select count(*) from inventory_assets where school_id=p_school and item_id=p_item)>=item.quantity then raise exception 'No unregistered equipment balance'; end if;
  if (select count(*) from inventory_assets where receipt_movement_id=p_receipt)>=receipt.quantity then raise exception 'Receipt already fully registered'; end if;
  insert into inventory_assets(id,school_id,item_id,receipt_movement_id,asset_code,serial_number,acquisition_date,acquisition_cost,notes,registered_by)
    values(p_id,p_school,p_item,p_receipt,p_code,p_serial,p_date,p_cost,p_notes,p_actor);
  return p_id;
end $$;
create function public.activate_inventory_asset(p_id uuid,p_school uuid,p_actor uuid,p_custodian text,p_location text)
returns void language plpgsql set search_path=public as $$
declare asset public.inventory_assets%rowtype;
begin
  if p_custodian is null or length(btrim(p_custodian)) not between 1 and 200 or p_location is null or length(btrim(p_location)) not between 1 and 200 then raise exception 'Custodian and location required'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  if not exists(select 1 from inventory_locations where school_id=p_school and name=p_location and is_active=true) then raise exception 'Active storage location required'; end if;
  select * into asset from inventory_assets where id=p_id and school_id=p_school for update;
  if not found then raise exception 'Asset registration required'; end if;
  if asset.status='in_use' then
    if asset.custodian=p_custodian and asset.location=p_location then return; end if;
    raise exception 'Asset already activated';
  end if;
  update inventory_assets set status='in_use',custodian=p_custodian,location=p_location,activated_by=p_actor,activated_at=now() where id=p_id;
end $$;

-- Generic consumable stock issues must never consume registered equipment.
alter function public.record_inventory_movement(uuid,uuid,uuid,text,integer,text,text,uuid) rename to record_inventory_movement_before_asset_types;
create function public.record_inventory_movement(p_id uuid,p_school uuid,p_item uuid,p_kind text,p_quantity integer,p_recipient text,p_note text,p_actor uuid)
returns void language plpgsql set search_path=public as $$
declare kind text;
begin
  select item_type into kind from inventory_items where id=p_item and school_id=p_school for update;
  if kind='equipment' and p_kind='issue' then raise exception 'Equipment must use asset registry'; end if;
  perform record_inventory_movement_before_asset_types(p_id,p_school,p_item,p_kind,p_quantity,p_recipient,p_note,p_actor);
end $$;
alter function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid,uuid) rename to submit_inventory_document_before_asset_types;
create function public.submit_inventory_document(p_id uuid,p_school uuid,p_kind text,p_recipient text,p_note text,p_actor uuid,p_lines jsonb,p_reference text,p_date date,p_source_request uuid default null,p_source_purchase uuid default null)
returns uuid language plpgsql set search_path=public as $$
begin
  if p_kind='issue' and exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid) join inventory_items i on i.id=l.item_id and i.school_id=p_school where i.item_type='equipment') then raise exception 'Equipment must use asset registry'; end if;
  return submit_inventory_document_before_asset_types(p_id,p_school,p_kind,p_recipient,p_note,p_actor,p_lines,p_reference,p_date,p_source_request,p_source_purchase);
end $$;
revoke all on function public.inventory_asset_receipts(uuid,uuid) from public,anon,authenticated;
revoke all on function public.register_inventory_asset(uuid,uuid,uuid,uuid,uuid,text,text,date,numeric,text) from public,anon,authenticated;
revoke all on function public.activate_inventory_asset(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.record_inventory_movement(uuid,uuid,uuid,text,integer,text,text,uuid) from public,anon,authenticated;
revoke all on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid,uuid) from public,anon,authenticated;
grant execute on function public.inventory_asset_receipts(uuid,uuid) to service_role;
grant execute on function public.register_inventory_asset(uuid,uuid,uuid,uuid,uuid,text,text,date,numeric,text) to service_role;
grant execute on function public.activate_inventory_asset(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.record_inventory_movement(uuid,uuid,uuid,text,integer,text,text,uuid) to service_role;
grant execute on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid,uuid) to service_role;
