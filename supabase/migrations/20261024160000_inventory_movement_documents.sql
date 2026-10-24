create table public.inventory_documents (
  id uuid primary key,
  school_id uuid not null references public.schools(id),
  document_number bigint generated always as identity unique,
  kind text not null check(kind in ('receive','issue')),
  recipient text not null default '',
  note text not null default '',
  lines jsonb not null,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique(school_id,id)
);
alter table public.inventory_documents enable row level security;
alter table public.inventory_movements add column document_id uuid;
alter table public.inventory_movements add constraint inventory_movement_document_fkey
  foreign key(school_id,document_id) references public.inventory_documents(school_id,id);
create unique index inventory_movement_document_item_key on public.inventory_movements(document_id,item_id) where document_id is not null;
create index inventory_documents_school_date on public.inventory_documents(school_id,created_at desc);

create function public.record_inventory_document(
  p_id uuid, p_school uuid, p_kind text, p_recipient text, p_note text,
  p_actor uuid, p_lines jsonb
) returns uuid language plpgsql set search_path=public as $$
declare normalized jsonb; previous public.inventory_documents%rowtype;
  line record; stock integer; movement_id uuid;
begin
  if p_id is null or p_kind is null or p_kind not in ('receive','issue')
    or p_recipient is null or length(p_recipient)>200
    or p_note is null or length(p_note)>1000
    or (p_kind='issue' and btrim(p_recipient)='') then
    raise exception 'Invalid document';
  end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines'; end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Expected 1-100 lines'; end if;
  if exists(select 1 from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity numeric)
    where item_id is null or quantity is null or quantity<1 or quantity>1000000000 or quantity<>trunc(quantity)) then
    raise exception 'Invalid quantity';
  end if;
  if (select count(distinct l.item_id) from jsonb_to_recordset(p_lines) as l(item_id uuid))<>jsonb_array_length(p_lines) then
    raise exception 'Duplicate item';
  end if;
  select jsonb_agg(jsonb_build_object('item_id',l.item_id,'quantity',l.quantity) order by l.item_id)
    into normalized from jsonb_to_recordset(p_lines) as l(item_id uuid,quantity integer);
  if not exists(select 1 from app_users where id=p_actor and school_id=p_school and is_active=true) then
    raise exception 'Invalid actor';
  end if;
  -- Serialize retries for the same document, including concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from inventory_documents where id=p_id;
  if found then
    if previous.school_id=p_school and previous.created_by=p_actor and previous.kind=p_kind
      and previous.recipient=p_recipient and previous.note=p_note and previous.lines=normalized then return p_id; end if;
    raise exception 'Document ID conflict';
  end if;
  -- A stable lock order prevents deadlocks between multi-item documents.
  for line in select * from jsonb_to_recordset(normalized) as l(item_id uuid,quantity integer) order by item_id loop
    select quantity into stock from inventory_items where id=line.item_id and school_id=p_school for update;
    if not found then raise exception 'Item not found'; end if;
    if p_kind='issue' and stock<line.quantity then raise exception 'Insufficient stock'; end if;
  end loop;
  insert into inventory_documents(id,school_id,kind,recipient,note,lines,created_by)
    values(p_id,p_school,p_kind,p_recipient,p_note,normalized,p_actor);
  for line in select * from jsonb_to_recordset(normalized) as l(item_id uuid,quantity integer) order by item_id loop
    movement_id := gen_random_uuid();
    perform record_inventory_movement(movement_id,p_school,line.item_id,p_kind,line.quantity,p_recipient,p_note,p_actor);
    update inventory_movements set document_id=p_id where id=movement_id;
  end loop;
  return p_id;
end $$;
revoke all on function public.record_inventory_document(uuid,uuid,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_inventory_document(uuid,uuid,text,text,text,uuid,jsonb) to service_role;
