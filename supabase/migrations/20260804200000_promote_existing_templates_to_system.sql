-- The initial template catalog was generated from three setup accounts, but
-- saved with school scope. Promote only those known active seed sets into the
-- shared system catalog. Personal drafts remain private to their owners.

update public.templates as template
set
  scope = 'system',
  school_id = null,
  updated_at = now()
where template.scope = 'school'
  and template.status = 'active'
  and exists (
    select 1
    from public.app_users as owner
    where owner.id = template.owner_id
      and owner.username in ('admin', 'demo2569_admin', 'marketplace_fc1b0d71')
  );
