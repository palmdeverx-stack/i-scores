begin;
create table public.inventory_returns (
  id uuid primary key,
  school_id uuid not null references public.schools(id),
  return_number bigint generated always as identity,
  kind text not null check(kind in ('material','equipment')),
  source_document_id uuid references public.inventory_documents(id),
  document_date date not null,
  returned_by text not null check(length(btrim(returned_by)) between 1 and 200),
  note text not null default '' check(length(note)<=1000),
  request_lines jsonb not null,
  lines jsonb not null,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  check((kind='material' and source_document_id is not null) or (kind='equipment' and source_document_id is null))
);
alter table public.inventory_returns enable row level security;
revoke all on public.inventory_returns from public,anon,authenticated;
grant all on public.inventory_returns to service_role;
grant usage,select on sequence public.inventory_returns_return_number_seq to service_role;
create index inventory_returns_school_date on public.inventory_returns(school_id,created_at desc);
create index inventory_returns_source on public.inventory_returns(source_document_id);
alter table public.inventory_movements add column return_id uuid references public.inventory_returns(id);
alter table public.inventory_assets drop constraint inventory_assets_status_check;
alter table public.inventory_assets add constraint inventory_assets_status_check check(status in ('registered','in_use','maintenance'));

create function public.record_inventory_return(
  p_id uuid,p_school uuid,p_actor uuid,p_kind text,p_source uuid,p_date date,p_returned_by text,p_note text,p_lines jsonb
) returns uuid language plpgsql set search_path=public as $$
declare previous public.inventory_returns%rowtype; source public.inventory_documents%rowtype;
  asset public.inventory_assets%rowtype; line record; normalized jsonb; snapshots jsonb:='[]';
  issued integer; already_returned bigint; movement uuid;
begin
  if p_id is null or p_kind is null or p_kind not in ('material','equipment') or p_date is null
    or p_returned_by is null or length(btrim(p_returned_by)) not between 1 and 200
    or p_note is null or length(p_note)>1000 then raise exception 'Invalid return'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid lines'; end if;
  if p_kind='material' then
    if p_source is null or exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric)
      where item_id is null or quantity is null or quantity<1 or quantity>1000000000 or quantity<>trunc(quantity)) then raise exception 'Invalid material return'; end if;
    if (select count(distinct item_id) from jsonb_to_recordset(p_lines) as l(item_id uuid))<>jsonb_array_length(p_lines) then raise exception 'Duplicate item'; end if;
    select jsonb_agg(jsonb_build_object('item_id',item_id,'quantity',quantity) order by item_id) into normalized
      from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity integer);
  else
    if p_source is not null or exists(select 1 from jsonb_to_recordset(p_lines) as l(asset_id uuid,activated_at timestamptz,condition text)
      where asset_id is null or activated_at is null or condition is null or condition not in ('good','damaged')) then raise exception 'Invalid asset return'; end if;
    if (select count(distinct asset_id) from jsonb_to_recordset(p_lines) as l(asset_id uuid))<>jsonb_array_length(p_lines) then raise exception 'Duplicate asset'; end if;
    select jsonb_agg(jsonb_build_object('asset_id',asset_id,'activated_at',activated_at,'condition',condition) order by asset_id) into normalized
      from jsonb_to_recordset(p_lines) as l(asset_id uuid,activated_at timestamptz,condition text);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_returns where id=p_id;
  if found then
    if previous.school_id=p_school and previous.kind=p_kind and previous.created_by=p_actor
      and previous.source_document_id is not distinct from p_source and previous.document_date=p_date
      and previous.returned_by=p_returned_by and previous.note=p_note and previous.request_lines=normalized then return p_id; end if;
    raise exception 'Return ID conflict';
  end if;
  if p_kind='material' then
    -- Serialize all partial returns against this source issue document.
    select * into source from inventory_documents where id=p_source and school_id=p_school for update;
    if not found or source.kind<>'issue' or source.status<>'posted' then raise exception 'Posted issue document required'; end if;
    for line in select * from jsonb_to_recordset(normalized) as l(item_id uuid,quantity integer) order by item_id loop
      select l.quantity into issued from jsonb_to_recordset(source.lines) as l(item_id uuid,quantity integer) where l.item_id=line.item_id;
      if issued is null then raise exception 'Item not in source document'; end if;
      perform 1 from inventory_items where id=line.item_id and school_id=p_school and item_type='material' for update;
      if not found then raise exception 'Material required'; end if;
      select coalesce(sum(l.quantity),0) into already_returned from inventory_returns r
        cross join lateral jsonb_to_recordset(r.request_lines) as l(item_id uuid,quantity integer)
        where r.school_id=p_school and r.source_document_id=p_source and l.item_id=line.item_id;
      if line.quantity>issued-already_returned then raise exception 'Return exceeds outstanding issue quantity'; end if;
    end loop;
    select jsonb_agg(jsonb_build_object('item_id',l.item_id,'quantity',l.quantity,
      'code',i.code,'item_name',i.name,'unit',i.unit) order by l.item_id) into snapshots
      from jsonb_to_recordset(normalized) as l(item_id uuid,quantity integer)
      join inventory_items i on i.id=l.item_id and i.school_id=p_school;
  else
    -- activated_at identifies the current custody cycle. An old form cannot
    -- accidentally return an asset that has since been issued again.
    for line in select * from jsonb_to_recordset(normalized) as l(asset_id uuid,activated_at timestamptz,condition text) order by asset_id loop
      select * into asset from inventory_assets where id=line.asset_id and school_id=p_school for update;
      if not found or asset.status<>'in_use' or asset.activated_at is distinct from line.activated_at then raise exception 'Asset custody changed'; end if;
      snapshots:=snapshots||jsonb_build_array(jsonb_build_object('asset_id',asset.id,'asset_code',asset.asset_code,
        'custodian',asset.custodian,'location',asset.location,'activated_at',asset.activated_at,'condition',line.condition));
    end loop;
  end if;
  insert into inventory_returns(id,school_id,kind,source_document_id,document_date,returned_by,note,request_lines,lines,created_by)
    values(p_id,p_school,p_kind,p_source,p_date,p_returned_by,p_note,normalized,snapshots,p_actor);
  if p_kind='material' then
    for line in select * from jsonb_to_recordset(normalized) as l(item_id uuid,quantity integer) order by item_id loop
      movement:=gen_random_uuid();
      perform record_inventory_movement(movement,p_school,line.item_id,'receive',line.quantity,p_returned_by,'Return: '||p_id::text||' '||p_note,p_actor);
      update inventory_movements set return_id=p_id where id=movement;
    end loop;
    insert into notifications(user_id,school_id,type,title,body,link,event_key)
      select u.id,p_school,'inventory_return','รับคืนวัสดุจากใบเบิกแล้ว',p_returned_by||' · '||p_note,
        case when u.role='school_admin' then '/admin/inventory/returns' else '/teacher/inventory/returns' end,
        'inventory-return:'||p_id::text
      from app_users u where u.id=source.created_by and u.school_id=p_school and u.is_active=true
        and u.id<>p_actor and u.role in ('school_admin','teacher')
      on conflict(user_id,event_key) do nothing;
  else
    for line in select * from jsonb_to_recordset(normalized) as l(asset_id uuid,condition text) order by asset_id loop
      update inventory_assets set status=case when line.condition='good' then 'registered' else 'maintenance' end,
        custodian='',location=null,activated_by=null,activated_at=null where id=line.asset_id and school_id=p_school;
    end loop;
  end if;
  return p_id;
end $$;
revoke all on function public.record_inventory_return(uuid,uuid,uuid,text,uuid,date,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_inventory_return(uuid,uuid,uuid,text,uuid,date,text,text,jsonb) to service_role;

-- Existing activation logic must not activate damaged equipment.
alter function public.activate_inventory_asset(uuid,uuid,uuid,text,text) rename to activate_inventory_asset_before_returns;
create function public.activate_inventory_asset(p_id uuid,p_school uuid,p_actor uuid,p_custodian text,p_location text)
returns void language plpgsql security definer set search_path='' as $$
declare state text;
begin
  select status into state from public.inventory_assets where id=p_id and school_id=p_school for update;
  if not found or state not in ('registered','in_use') then raise exception 'Asset not available for use'; end if;
  perform public.activate_inventory_asset_before_returns(p_id,p_school,p_actor,p_custodian,p_location);
end $$;
revoke all on function public.activate_inventory_asset_before_returns(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.activate_inventory_asset(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.activate_inventory_asset(uuid,uuid,uuid,text,text) to service_role;
commit;
