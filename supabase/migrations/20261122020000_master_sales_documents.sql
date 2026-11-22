create sequence public.master_sales_document_numbers;

create table public.master_sales_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contract', 'quotation', 'invoice', 'billing_note', 'receipt', 'other')),
  status text not null default 'draft' check (status in ('draft', 'issued')),
  document_number text unique,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  total_satang bigint not null default 0 check (total_satang >= 0),
  created_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  check ((status = 'issued') = (document_number is not null)),
  check ((status = 'issued') = (issued_at is not null))
);

create index master_sales_documents_updated_idx on public.master_sales_documents(updated_at desc, id desc);

create function public.number_master_sales_document() returns trigger
language plpgsql set search_path = public
as $$
declare
  prefix text;
  serial_number text;
begin
  if old.status <> 'draft' then
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
      when 'quotation' then 'QT'
      when 'invoice' then 'INV'
      when 'billing_note' then 'BIL'
      when 'receipt' then 'RC'
      else 'DOC'
    end;
    new.issued_at := new.updated_at;
    serial_number := nextval('public.master_sales_document_numbers')::text;
    new.document_number := prefix || '-' || to_char(new.issued_at at time zone 'Asia/Bangkok', 'YYYY') ||
      '-' || lpad(serial_number, greatest(6, length(serial_number)), '0');
  end if;
  return new;
end;
$$;

create trigger master_sales_documents_number
before update on public.master_sales_documents
for each row execute function public.number_master_sales_document();

alter table public.master_sales_documents enable row level security;
revoke all on public.master_sales_documents from public, anon, authenticated;
revoke all on sequence public.master_sales_document_numbers from public, anon, authenticated;
revoke all on function public.number_master_sales_document() from public, anon, authenticated;
grant select, insert, update on public.master_sales_documents to service_role;
grant usage on sequence public.master_sales_document_numbers to service_role;
