create or replace function public.number_master_sales_document() returns trigger
language plpgsql set search_path = public
as $$
declare
  prefix text;
  numbering_year integer;
  serial_number text;
begin
  if old.status <> 'draft' then
    if old.kind = 'quotation' then
      if (new.kind, new.status, new.document_number, new.issued_at, new.created_at, new.created_by, new.id)
         is distinct from
         (old.kind, old.status, old.document_number, old.issued_at, old.created_at, old.created_by, old.id) then
        raise exception 'Issued quotation identity cannot be modified';
      end if;
      new.updated_at := clock_timestamp();
      return new;
    end if;

    if (new.kind, new.status, new.document_number, new.content, new.total_satang, new.issued_at)
       is distinct from
       (old.kind, old.status, old.document_number, old.content, old.total_satang, old.issued_at) then
      raise exception 'Issued sales documents cannot be modified';
    end if;
    return new;
  end if;

  new.updated_at := clock_timestamp();
  if new.status = 'issued' then
    prefix := case new.kind
      when 'contract' then 'CT'
      when 'quotation' then 'QU'
      when 'invoice' then 'INV'
      when 'billing_note' then 'BIL'
      when 'receipt' then 'RC'
      else 'DOC'
    end;
    new.issued_at := new.updated_at;
    numbering_year := extract(year from new.issued_at at time zone 'Asia/Bangkok')::integer + 543;

    insert into public.master_sales_document_annual_numbers as counter (kind, buddhist_year, last_number)
      values (new.kind, numbering_year, 1)
    on conflict (kind, buddhist_year) do update set last_number = counter.last_number + 1
    returning last_number::text into serial_number;

    new.document_number := prefix || lpad((numbering_year % 100)::text, 2, '0')
      || lpad(serial_number, greatest(4, length(serial_number)), '0');
  end if;
  return new;
end;
$$;
