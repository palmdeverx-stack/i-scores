-- Send approved grade results to linked guardians through the existing LINE queue.

alter table public.line_notification_deliveries
  drop constraint if exists line_notification_deliveries_source_type_check,
  drop constraint if exists line_notification_deliveries_event_type_check;

alter table public.line_notification_deliveries
  add constraint line_notification_deliveries_source_type_check
    check (
      source_type in (
        'homeroom_attendance',
        'class_attendance',
        'announcement',
        'grade_result'
      )
    ),
  add constraint line_notification_deliveries_event_type_check
    check (
      event_type in (
        'absent',
        'leave',
        'late',
        'class_absent',
        'announcement',
        'grade_result'
      )
    ),
  add column if not exists requested_by uuid references public.app_users (id) on delete set null;

create index if not exists line_notification_deliveries_grade_result_idx
  on public.line_notification_deliveries (source_record_id, status, created_at desc)
  where source_type = 'grade_result';
