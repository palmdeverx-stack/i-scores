create function public.protect_issued_master_sales_document_delete() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Only draft sales documents can be deleted';
  end if;
  return old;
end;
$$;

create trigger master_sales_documents_protect_delete
before delete on public.master_sales_documents
for each row execute function public.protect_issued_master_sales_document_delete();

revoke all on function public.protect_issued_master_sales_document_delete() from public, anon, authenticated;
grant delete on public.master_sales_documents to service_role;
