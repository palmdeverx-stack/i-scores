create table public.inventory_purchases (
  id uuid primary key,
  school_id uuid not null references public.schools(id),
  purchase_number bigint generated always as identity unique,
  title text not null check(length(btrim(title)) between 1 and 200),
  purpose text not null default '',
  lines jsonb not null,
  status text not null default 'submitted' check(status in ('submitted','approved','rejected','ordered','partially_received','received')),
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.app_users(id),
  reviewed_at timestamptz,
  review_note text not null default '',
  supplier text not null default '',
  order_number text not null default '',
  order_date date,
  attachment_path text,
  ordered_by uuid references public.app_users(id),
  ordered_at timestamptz,
  unique(school_id,id)
);
alter table public.inventory_purchases enable row level security;
create index inventory_purchases_school_date on public.inventory_purchases(school_id,created_at desc);
alter table public.inventory_documents add column source_purchase_id uuid;
alter table public.inventory_documents add constraint inventory_document_purchase_fkey
  foreign key(school_id,source_purchase_id) references public.inventory_purchases(school_id,id);
create index inventory_documents_purchase_source on public.inventory_documents(source_purchase_id) where source_purchase_id is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('inventory-purchase-orders','inventory-purchase-orders',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create function public.create_inventory_purchase(p_id uuid,p_school uuid,p_actor uuid,p_title text,p_purpose text,p_lines jsonb)
returns uuid language plpgsql set search_path=public as $$
declare previous public.inventory_purchases%rowtype; normalized jsonb;
begin
  if p_title is null or length(btrim(p_title)) not between 1 and 200 or p_purpose is null or length(p_purpose)>2000 then raise exception 'Invalid purchase'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid lines'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric)
    where item_id is null or quantity is null or quantity<1 or quantity>1000000000 or quantity<>trunc(quantity)) then raise exception 'Invalid quantity'; end if;
  if (select count(distinct item_id) from jsonb_to_recordset(p_lines) as l(item_id uuid))<>jsonb_array_length(p_lines) then raise exception 'Duplicate item'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid) where not exists(select 1 from inventory_items i where i.id=l.item_id and i.school_id=p_school)) then raise exception 'Item not found'; end if;
  select jsonb_agg(jsonb_build_object('item_id',l.item_id,'quantity',l.quantity) order by l.item_id) into normalized from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity integer);
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_purchases where id=p_id;
  if found then
    if previous.school_id=p_school and previous.created_by=p_actor and previous.title=p_title and previous.purpose=p_purpose and previous.lines=normalized then return p_id; end if;
    raise exception 'Purchase ID conflict';
  end if;
  insert into inventory_purchases(id,school_id,created_by,title,purpose,lines) values(p_id,p_school,p_actor,p_title,p_purpose,normalized);
  return p_id;
end $$;
create function public.review_inventory_purchase(p_id uuid,p_school uuid,p_actor uuid,p_approve boolean,p_note text)
returns void language plpgsql set search_path=public as $$
declare purchase public.inventory_purchases%rowtype;
begin
  if p_note is null or length(p_note)>1000 or p_approve is null or (not p_approve and btrim(p_note)='') then raise exception 'Review note required'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  select * into purchase from inventory_purchases where id=p_id and school_id=p_school for update;
  if not found then raise exception 'Purchase not found'; end if;
  if purchase.status<>'submitted' then
    if (p_approve and purchase.status in ('approved','ordered','partially_received','received')) or (not p_approve and purchase.status='rejected') then return; end if;
    raise exception 'Already reviewed';
  end if;
  update inventory_purchases set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=p_actor,reviewed_at=now(),review_note=p_note where id=p_id;
end $$;
create function public.order_inventory_purchase(p_id uuid,p_school uuid,p_actor uuid,p_supplier text,p_number text,p_date date)
returns void language plpgsql set search_path=public as $$
declare purchase public.inventory_purchases%rowtype;
begin
  if p_supplier is null or length(btrim(p_supplier)) not between 1 and 200 or p_number is null or length(btrim(p_number)) not between 1 and 200 or p_date is null then raise exception 'Order details required'; end if;
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then raise exception 'Invalid actor'; end if;
  select * into purchase from inventory_purchases where id=p_id and school_id=p_school for update;
  if not found then raise exception 'Purchase not found'; end if;
  if purchase.status in ('ordered','partially_received','received') and purchase.supplier=p_supplier and purchase.order_number=p_number and purchase.order_date=p_date then return; end if;
  if purchase.status<>'approved' or purchase.attachment_path is null then raise exception 'Approval and purchase order attachment required'; end if;
  update inventory_purchases set supplier=p_supplier,order_number=p_number,order_date=p_date,ordered_by=p_actor,ordered_at=now(),status='ordered' where id=p_id;
end $$;

create function public.inventory_purchase_remaining(p_school uuid,p_id uuid)
returns table(item_id uuid,quantity bigint) language sql stable set search_path=public as $$
  select l.item_id,greatest(0,l.quantity-coalesce((
    select sum(r.quantity) from inventory_documents receipt
    cross join lateral jsonb_to_recordset(receipt.lines) as r(item_id uuid,quantity bigint)
    where receipt.school_id=p_school and receipt.source_purchase_id=source.id and receipt.kind='receive' and receipt.status='posted' and r.item_id=l.item_id
  ),0))::bigint from inventory_purchases source
  cross join lateral jsonb_to_recordset(source.lines) as l(item_id uuid,quantity bigint)
  where source.id=p_id and source.school_id=p_school and source.status in ('ordered','partially_received','received');
$$;

alter function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid) rename to submit_inventory_document_before_purchase;
create function public.submit_inventory_document(
  p_id uuid,p_school uuid,p_kind text,p_recipient text,p_note text,p_actor uuid,p_lines jsonb,
  p_reference text,p_date date,p_source_request uuid default null,p_source_purchase uuid default null
) returns uuid language plpgsql set search_path=public as $$
declare purchase public.inventory_purchases%rowtype; previous public.inventory_documents%rowtype; line record; remaining bigint; result_id uuid;
begin
  if p_source_purchase is not null and (p_kind<>'receive' or p_source_request is not null) then raise exception 'Invalid purchase source'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_documents where id=p_id;
  if found then
    if previous.school_id<>p_school or previous.source_purchase_id is distinct from p_source_purchase then raise exception 'Document ID conflict'; end if;
    return submit_inventory_document_before_purchase(p_id,p_school,p_kind,p_recipient,p_note,p_actor,p_lines,p_reference,p_date,p_source_request);
  end if;
  if p_source_purchase is not null then
    select * into purchase from inventory_purchases where id=p_source_purchase and school_id=p_school for update;
    if not found or purchase.status not in ('ordered','partially_received') or purchase.attachment_path is null then raise exception 'Invalid purchase source'; end if;
    if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
    for line in select * from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric) loop
      select r.quantity into remaining from inventory_purchase_remaining(p_school,p_source_purchase) r where r.item_id=line.item_id;
      if remaining is null or line.quantity>remaining then raise exception 'Receipt exceeds purchase remaining quantity'; end if;
    end loop;
  end if;
  result_id:=submit_inventory_document_before_purchase(p_id,p_school,p_kind,p_recipient,p_note,p_actor,p_lines,p_reference,p_date,p_source_request);
  if p_source_purchase is not null then
    update inventory_documents set source_purchase_id=p_source_purchase where id=result_id;
    update inventory_purchases set status=case when exists(select 1 from inventory_purchase_remaining(p_school,p_source_purchase) where quantity>0) then 'partially_received' else 'received' end where id=p_source_purchase;
  end if;
  return result_id;
end $$;
revoke all on function public.create_inventory_purchase(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.review_inventory_purchase(uuid,uuid,uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.order_inventory_purchase(uuid,uuid,uuid,text,text,date) from public,anon,authenticated;
revoke all on function public.inventory_purchase_remaining(uuid,uuid) from public,anon,authenticated;
revoke all on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_inventory_purchase(uuid,uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.review_inventory_purchase(uuid,uuid,uuid,boolean,text) to service_role;
grant execute on function public.order_inventory_purchase(uuid,uuid,uuid,text,text,date) to service_role;
grant execute on function public.inventory_purchase_remaining(uuid,uuid) to service_role;
grant execute on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid,uuid) to service_role;
