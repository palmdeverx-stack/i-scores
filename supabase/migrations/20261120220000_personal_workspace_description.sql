alter table public.schools
  add column workspace_description text,
  add constraint schools_workspace_description_check
    check (
      workspace_description is null
      or (workspace_type = 'personal' and char_length(workspace_description) <= 1000)
    );
