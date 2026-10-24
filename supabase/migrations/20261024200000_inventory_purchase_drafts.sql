alter table public.inventory_purchases drop constraint inventory_purchases_status_check;
alter table public.inventory_purchases add constraint inventory_purchases_status_check
  check(status in ('draft','submitted','approved','rejected','ordered','partially_received','received'));

create function public.save_inventory_purchase(
  p_id uuid,p_school uuid,p_actor uuid,p_title text,p_purpose text,p_lines jsonb,p_draft boolean
) returns uuid language plpgsql set search_path=public as $$
declare previous public.inventory_purchases%rowtype; normalized jsonb; actor_role text;
begin
  if p_draft is null or p_title is null or length(btrim(p_title)) not between 1 and 200
    or p_purpose is null or length(p_purpose)>2000 or (not p_draft and btrim(p_purpose)='') then raise exception 'Invalid purchase'; end if;
  select role into actor_role from app_users where id=p_actor and school_id=p_school and is_active=true;
  if not found then raise exception 'Invalid actor'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
  if jsonb_array_length(p_lines)>100 or (not p_draft and jsonb_array_length(p_lines)=0) then raise exception 'Invalid lines'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric)
    where item_id is null or quantity is null or quantity<1 or quantity>1000000000 or quantity<>trunc(quantity)) then raise exception 'Invalid quantity'; end if;
  if (select count(distinct item_id) from jsonb_to_recordset(p_lines) as l(item_id uuid))<>jsonb_array_length(p_lines) then raise exception 'Duplicate item'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid) where not exists(select 1 from inventory_items i where i.id=l.item_id and i.school_id=p_school)) then raise exception 'Item not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id',l.item_id,'quantity',l.quantity) order by l.item_id),'[]'::jsonb) into normalized from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity integer);
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_purchases where id=p_id for update;
  if found then
    if previous.school_id<>p_school or (previous.created_by<>p_actor and actor_role<>'school_admin') then raise exception 'Cannot edit this draft'; end if;
    if previous.status<>'draft' then
      if not p_draft and previous.title=p_title and previous.purpose=p_purpose and previous.lines=normalized then return p_id; end if;
      raise exception 'Only drafts can be edited';
    end if;
    update inventory_purchases set title=p_title,purpose=p_purpose,lines=normalized,
      status=case when p_draft then 'draft' else 'submitted' end where id=p_id;
  else
    insert into inventory_purchases(id,school_id,created_by,title,purpose,lines,status)
      values(p_id,p_school,p_actor,p_title,p_purpose,normalized,case when p_draft then 'draft' else 'submitted' end);
  end if;
  return p_id;
end $$;
revoke all on function public.save_inventory_purchase(uuid,uuid,uuid,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_inventory_purchase(uuid,uuid,uuid,text,text,jsonb,boolean) to service_role;
