alter table public.school_user_documents add column content jsonb;
alter table public.school_user_documents add constraint school_document_content_object
  check(content is null or jsonb_typeof(content)='object');
comment on column public.school_user_documents.content is 'Editable document content copied from a template; independent per owner document.';
