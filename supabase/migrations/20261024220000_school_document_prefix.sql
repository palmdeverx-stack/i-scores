alter table public.schools add column document_prefix text;
alter table public.schools add constraint schools_document_prefix_length check(document_prefix is null or length(btrim(document_prefix)) between 1 and 100);
comment on column public.schools.document_prefix is 'School correspondence reference prefix; individual document sequence is assigned separately.';
