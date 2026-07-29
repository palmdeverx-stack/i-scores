-- eKru uses app_users ids for per-teacher Marketplace license assignments.
-- These foreign keys make that shared contract explicit.

alter table public.marketplace_teacher_license_assignments
  drop constraint if exists marketplace_teacher_license_assignments_teacher_id_fkey,
  add constraint marketplace_teacher_license_assignments_teacher_id_fkey
    foreign key (teacher_id) references public.app_users(id) on delete cascade;

alter table public.marketplace_teacher_license_assignments
  drop constraint if exists marketplace_teacher_license_assignments_assigned_by_fkey,
  add constraint marketplace_teacher_license_assignments_assigned_by_fkey
    foreign key (assigned_by) references public.app_users(id) on delete restrict;

create index if not exists marketplace_teacher_license_assignments_license_idx
  on public.marketplace_teacher_license_assignments (license_id)
  where revoked_at is null;

