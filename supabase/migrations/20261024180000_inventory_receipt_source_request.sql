alter table public.inventory_documents add column source_request_id uuid;
alter table public.inventory_documents add constraint inventory_document_source_fkey
  foreign key(school_id,source_request_id) references public.inventory_documents(school_id,id);
create index inventory_documents_source_request_idx on public.inventory_documents(source_request_id) where source_request_id is not null;

alter function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date)
  rename to submit_inventory_document_without_source;

create function public.submit_inventory_document(
  p_id uuid,p_school uuid,p_kind text,p_recipient text,p_note text,p_actor uuid,
  p_lines jsonb,p_reference text,p_date date,p_source_request uuid default null
) returns uuid language plpgsql set search_path=public as $$
declare source_doc public.inventory_documents%rowtype; previous public.inventory_documents%rowtype;
  line record; requested bigint; received bigint; result_id uuid;
begin
  if p_source_request is not null and p_kind<>'receive' then raise exception 'Source only allowed for receipts'; end if;
  -- Always serialize same-document retries before locking the source request.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_documents where id=p_id;
  if found then
    if previous.school_id<>p_school or previous.source_request_id is distinct from p_source_request then raise exception 'Document ID conflict'; end if;
    return submit_inventory_document_without_source(p_id,p_school,p_kind,p_recipient,p_note,p_actor,p_lines,p_reference,p_date);
  end if;
  if p_source_request is not null then
    select * into source_doc from inventory_documents where id=p_source_request and school_id=p_school for update;
    if not found or source_doc.kind<>'issue' or source_doc.status='rejected' then raise exception 'Invalid source request'; end if;
    if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
    -- Serialize all receipts for this source to prevent over-receiving.
    for line in select * from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric) loop
      select l.quantity into requested from jsonb_to_recordset(source_doc.lines) as l(item_id uuid,quantity bigint) where l.item_id=line.item_id;
      if requested is null then raise exception 'Item does not match source request'; end if;
      select coalesce(sum(l.quantity),0) into received from inventory_documents d
        cross join lateral jsonb_to_recordset(d.lines) as l(item_id uuid,quantity bigint)
        where d.school_id=p_school and d.source_request_id=p_source_request and d.kind='receive' and d.status='posted' and l.item_id=line.item_id;
      if line.quantity>requested-received then raise exception 'Receipt exceeds source remaining quantity'; end if;
    end loop;
  end if;
  result_id := submit_inventory_document_without_source(p_id,p_school,p_kind,p_recipient,p_note,p_actor,p_lines,p_reference,p_date);
  if p_source_request is not null then update inventory_documents set source_request_id=p_source_request where id=result_id; end if;
  return result_id;
end $$;
revoke all on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid) from public,anon,authenticated;
grant execute on function public.submit_inventory_document(uuid,uuid,text,text,text,uuid,jsonb,text,date,uuid) to service_role;

create function public.inventory_request_remaining(p_school uuid,p_id uuid)
returns table(item_id uuid,quantity bigint) language sql stable set search_path=public as $$
  select l.item_id,greatest(0,l.quantity-coalesce((
    select sum(r.quantity) from inventory_documents receipt
    cross join lateral jsonb_to_recordset(receipt.lines) as r(item_id uuid,quantity bigint)
    where receipt.school_id=p_school and receipt.source_request_id=source.id
      and receipt.kind='receive' and receipt.status='posted' and r.item_id=l.item_id
  ),0))::bigint
  from inventory_documents source
  cross join lateral jsonb_to_recordset(source.lines) as l(item_id uuid,quantity bigint)
  where source.id=p_id and source.school_id=p_school and source.kind='issue' and source.status<>'rejected';
$$;
revoke all on function public.inventory_request_remaining(uuid,uuid) from public,anon,authenticated;
grant execute on function public.inventory_request_remaining(uuid,uuid) to service_role;
