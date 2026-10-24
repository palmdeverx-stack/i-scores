-- Set this to the LAST number already used; the next document receives +1.
alter table public.schools add column document_sequence_current bigint not null default 0 check(document_sequence_current between 0 and 999999999999);
alter table public.school_user_documents
  add column document_sequence bigint,
  add column document_number text;
create unique index school_documents_sequence_key on public.school_user_documents(school_id,document_sequence) where document_sequence is not null;

create function public.protect_school_document_counter() returns trigger language plpgsql set search_path=public as $$
begin
  if new.document_sequence_current<old.document_sequence_current then raise exception 'Document counter cannot go backwards'; end if;
  return new;
end $$;
create trigger schools_protect_document_counter before update of document_sequence_current on public.schools for each row execute function public.protect_school_document_counter();

create function public.assign_school_document_number() returns trigger language plpgsql set search_path=public as $$
declare school public.schools%rowtype; next_number bigint;
begin
  if tg_op='INSERT' then
    select * into school from schools where id=new.school_id for update;
    if not found then raise exception 'School not found'; end if;
    next_number:=school.document_sequence_current+1;
    update schools set document_sequence_current=next_number where id=new.school_id;
    new.document_sequence:=next_number;
    new.document_number:=case when nullif(btrim(school.document_prefix),'') is null then next_number::text
      else regexp_replace(btrim(school.document_prefix),'/+$','') || '/' || next_number::text end;
  else
    if new.school_id is distinct from old.school_id or new.document_sequence is distinct from old.document_sequence or new.document_number is distinct from old.document_number then raise exception 'Document number is immutable'; end if;
  end if;
  if new.document_number is not null and new.content is not null then
    new.content:=jsonb_set(new.content,'{documentNumber}',to_jsonb(new.document_number),true);
  end if;
  return new;
end $$;
create trigger school_documents_assign_number before insert or update on public.school_user_documents for each row execute function public.assign_school_document_number();
