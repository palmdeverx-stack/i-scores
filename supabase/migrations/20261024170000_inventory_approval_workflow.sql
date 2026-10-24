-- Legacy documents were already posted. New issues wait for approval.
alter table public.inventory_documents
  add column status text not null default 'posted' check(status in ('submitted','posted','rejected')),
  add column reference_number text not null default '',
  add column document_date date,
  add column reviewed_by uuid references public.app_users(id),
  add column reviewed_at timestamptz,
  add column review_note text not null default '';

create function public.submit_inventory_document(
  p_id uuid,p_school uuid,p_kind text,p_recipient text,p_note text,p_actor uuid,
  p_lines jsonb,p_reference text,p_date date
) returns uuid language plpgsql set search_path=public as $$
declare normalized jsonb; previous public.inventory_documents%rowtype;
begin
  if p_kind is null or p_kind not in ('receive','issue') or p_recipient is null or length(p_recipient)>200
    or p_note is null or length(p_note)>1000 or p_reference is null or length(p_reference)>200
    or (p_kind='issue' and btrim(p_recipient)='')
    or (p_kind='receive' and (btrim(p_reference)='' or p_date is null)) then raise exception 'Invalid document'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid lines'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric)
    where item_id is null or quantity is null or quantity<1 or quantity>1000000000 or quantity<>trunc(quantity)) then raise exception 'Invalid quantity'; end if;
  if (select count(distinct item_id) from jsonb_to_recordset(p_lines) as l(item_id uuid))<>jsonb_array_length(p_lines) then raise exception 'Duplicate item'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid) where not exists(select 1 from inventory_items i where i.id=l.item_id and i.school_id=p_school)) then raise exception 'Item not found'; end if;
  select jsonb_agg(jsonb_build_object('item_id',l.item_id,'quantity',l.quantity) order by l.item_id) into normalized
    from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity integer);
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_documents where id=p_id;
  if found then
    if previous.school_id=p_school and previous.kind=p_kind and previous.created_by=p_actor
      and previous.lines=normalized and previous.recipient=p_recipient and previous.note=p_note
      and previous.reference_number=p_reference and previous.document_date is not distinct from p_date then return p_id; end if;
    raise exception 'Document ID conflict';
  end if;
  if p_kind='receive' then
    perform record_inventory_document(p_id,p_school,p_kind,p_recipient,p_note,p_actor,normalized);
    update inventory_documents set reference_number=p_reference,document_date=p_date where id=p_id;
  else
    insert into inventory_documents(id,school_id,kind,recipient,note,lines,created_by,status,reference_number,document_date)
      values(p_id,p_school,p_kind,p_recipient,p_note,normalized,p_actor,'submitted',p_reference,p_date);
  end if;
  return p_id;
end $$;

create function public.review_inventory_document(p_id uuid,p_school uuid,p_actor uuid,p_approve boolean,p_note text)
returns void language plpgsql set search_path=public as $$
declare doc public.inventory_documents%rowtype; line record; stock integer; movement_id uuid;
begin
  if p_approve is null or p_note is null or length(p_note)>1000 or (not p_approve and btrim(p_note)='') then raise exception 'Review note required'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  select * into doc from inventory_documents where id=p_id and school_id=p_school for update;
  if not found or doc.kind<>'issue' then raise exception 'Document not found'; end if;
  if doc.status<>'submitted' then
    if (p_approve and doc.status='posted') or (not p_approve and doc.status='rejected') then return; end if;
    raise exception 'Document already reviewed';
  end if;
  if p_approve then
    for line in select * from jsonb_to_recordset(doc.lines) as l(item_id uuid,quantity integer) order by item_id loop
      select quantity into stock from inventory_items where id=line.item_id and school_id=p_school for update;
      if not found then raise exception 'Item not found'; end if;
      if stock<line.quantity then raise exception 'Insufficient stock'; end if;
    end loop;
    for line in select * from jsonb_to_recordset(doc.lines) as l(item_id uuid,quantity integer) order by item_id loop
      movement_id:=gen_random_uuid();
      perform record_inventory_movement(movement_id,p_school,line.item_id,'issue',line.quantity,doc.recipient,doc.note,p_actor);
      update inventory_movements set document_id=p_id where id=movement_id;
    end loop;
  end if;
  update inventory_documents set status=case when p_approve then 'posted' else 'rejected' end,
    reviewed_by=p_actor,reviewed_at=now(),review_note=p_note where id=p_id;
end $$;
revoke all on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date) from public,anon,authenticated;
revoke all on function public.review_inventory_document(uuid,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date) to service_role;
grant execute on function public.review_inventory_document(uuid,uuid,uuid,boolean,text) to service_role;
