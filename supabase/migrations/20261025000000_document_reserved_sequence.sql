-- Explicit reservations do not advance the automatic counter. All allocations
-- lock the same school row, so automatic and explicit requests cannot race.
alter table public.school_user_documents
  add column requested_document_sequence bigint
  check(requested_document_sequence between 1 and 999999999999);

create or replace function public.assign_school_document_number() returns trigger language plpgsql set search_path=public as $$
declare school public.schools%rowtype; next_number bigint;
begin
  if tg_op='INSERT' then
    select * into school from schools where id=new.school_id for update;
    if not found then raise exception 'School not found'; end if;
    if new.requested_document_sequence is not null then
      if new.status<>'reserved' then raise exception 'Explicit numbers require a reservation'; end if;
      next_number:=new.requested_document_sequence;
      if next_number<=school.document_sequence_current or exists(
        select 1 from school_user_documents where school_id=new.school_id and document_sequence=next_number
      ) then raise exception 'Document number unavailable' using errcode='23505'; end if;
    else
      next_number:=school.document_sequence_current+1;
      while exists(select 1 from school_user_documents where school_id=new.school_id and document_sequence=next_number) loop
        next_number:=next_number+1;
      end loop;
      if next_number>999999999999 then raise exception 'Document sequence exhausted'; end if;
      update schools set document_sequence_current=next_number where id=new.school_id;
    end if;
    new.document_sequence:=next_number;
    new.document_number:=case when nullif(btrim(school.document_prefix),'') is null then next_number::text
      else regexp_replace(btrim(school.document_prefix),'/+$','') || '/' || next_number::text end;
  else
    if new.school_id is distinct from old.school_id or new.document_sequence is distinct from old.document_sequence
      or new.document_number is distinct from old.document_number
      or new.requested_document_sequence is distinct from old.requested_document_sequence then
      raise exception 'Document number is immutable';
    end if;
  end if;
  if new.document_number is not null and new.content is not null then
    new.content:=jsonb_set(new.content,'{documentNumber}',to_jsonb(new.document_number),true);
  end if;
  return new;
end $$;
