create table if not exists public.school_period_sync_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  synced_by uuid references public.app_users (id) on delete set null,
  before_periods jsonb not null,
  after_periods jsonb not null,
  before_schedules jsonb not null,
  after_schedules jsonb not null,
  before_approvals jsonb not null,
  after_approvals jsonb not null,
  sync_result jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid references public.app_users (id) on delete set null
);

create index if not exists school_period_sync_runs_latest_idx
  on public.school_period_sync_runs (school_id, semester_id, created_at desc)
  where undone_at is null;

alter table public.school_period_sync_runs enable row level security;

create or replace function public.sync_school_periods_to_semester_with_snapshot(
  target_school_id uuid,
  target_semester_id uuid,
  actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  periods_before jsonb;
  periods_after jsonb;
  schedules_before jsonb;
  schedules_after jsonb;
  approvals_before jsonb;
  approvals_after jsonb;
  sync_result jsonb;
  run_id uuid;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(target_school_id::text || ':' || target_semester_id::text, 0)
  );

  select coalesce(jsonb_agg(to_jsonb(period) order by period.id), '[]'::jsonb)
  into periods_before
  from public.schedule_periods period
  where period.school_id = target_school_id
    and period.semester_id = target_semester_id;

  select coalesce(jsonb_agg(to_jsonb(schedule) order by schedule.id), '[]'::jsonb)
  into schedules_before
  from public.teaching_schedules schedule
  join public.teacher_assignments assignment on assignment.id = schedule.teacher_assignment_id
  join public.classrooms classroom on classroom.id = assignment.classroom_id
  where classroom.school_id = target_school_id
    and assignment.semester_id = target_semester_id;

  select coalesce(jsonb_agg(to_jsonb(approval) order by approval.id), '[]'::jsonb)
  into approvals_before
  from public.classroom_schedule_approvals approval
  where approval.school_id = target_school_id
    and approval.semester_id = target_semester_id;

  sync_result := public.sync_school_periods_to_semester_authoritative(
    target_school_id,
    target_semester_id
  );

  select coalesce(jsonb_agg(to_jsonb(period) order by period.id), '[]'::jsonb)
  into periods_after
  from public.schedule_periods period
  where period.school_id = target_school_id
    and period.semester_id = target_semester_id;

  select coalesce(jsonb_agg(to_jsonb(schedule) order by schedule.id), '[]'::jsonb)
  into schedules_after
  from public.teaching_schedules schedule
  join public.teacher_assignments assignment on assignment.id = schedule.teacher_assignment_id
  join public.classrooms classroom on classroom.id = assignment.classroom_id
  where classroom.school_id = target_school_id
    and assignment.semester_id = target_semester_id;

  select coalesce(jsonb_agg(to_jsonb(approval) order by approval.id), '[]'::jsonb)
  into approvals_after
  from public.classroom_schedule_approvals approval
  where approval.school_id = target_school_id
    and approval.semester_id = target_semester_id;

  if periods_before is distinct from periods_after
    or schedules_before is distinct from schedules_after
    or approvals_before is distinct from approvals_after
  then
    insert into public.school_period_sync_runs (
      school_id,
      semester_id,
      synced_by,
      before_periods,
      after_periods,
      before_schedules,
      after_schedules,
      before_approvals,
      after_approvals,
      sync_result
    ) values (
      target_school_id,
      target_semester_id,
      actor_id,
      periods_before,
      periods_after,
      schedules_before,
      schedules_after,
      approvals_before,
      approvals_after,
      sync_result
    ) returning id into run_id;
  end if;

  return sync_result || jsonb_build_object('syncRunId', run_id);
end;
$$;

create or replace function public.undo_school_period_sync(
  target_school_id uuid,
  target_semester_id uuid,
  actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sync_run public.school_period_sync_runs%rowtype;
  current_periods jsonb;
  current_schedules jsonb;
  current_approvals jsonb;
  restored_periods integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(target_school_id::text || ':' || target_semester_id::text, 0)
  );

  select * into sync_run
  from public.school_period_sync_runs run
  where run.school_id = target_school_id
    and run.semester_id = target_semester_id
    and run.undone_at is null
  order by run.created_at desc
  limit 1
  for update;

  if sync_run.id is null then
    raise exception 'ไม่มีประวัติการซิงค์ที่สามารถย้อนกลับได้';
  end if;

  select coalesce(jsonb_agg(to_jsonb(period) order by period.id), '[]'::jsonb)
  into current_periods
  from public.schedule_periods period
  where period.school_id = target_school_id
    and period.semester_id = target_semester_id;

  select coalesce(jsonb_agg(to_jsonb(schedule) order by schedule.id), '[]'::jsonb)
  into current_schedules
  from public.teaching_schedules schedule
  join public.teacher_assignments assignment on assignment.id = schedule.teacher_assignment_id
  join public.classrooms classroom on classroom.id = assignment.classroom_id
  where classroom.school_id = target_school_id
    and assignment.semester_id = target_semester_id;

  select coalesce(jsonb_agg(to_jsonb(approval) order by approval.id), '[]'::jsonb)
  into current_approvals
  from public.classroom_schedule_approvals approval
  where approval.school_id = target_school_id
    and approval.semester_id = target_semester_id;

  if current_periods is distinct from sync_run.after_periods
    or current_schedules is distinct from sync_run.after_schedules
    or current_approvals is distinct from sync_run.after_approvals
  then
    raise exception using
      errcode = 'P0001',
      message = 'ไม่สามารถย้อนกลับได้ เพราะมีการแก้ไขตารางสอนหรือสถานะอนุมัติหลังการซิงค์';
  end if;

  delete from public.schedule_periods period
  where period.school_id = target_school_id
    and period.semester_id = target_semester_id;

  insert into public.schedule_periods (
    id, school_id, semester_id, period_number, name, start_time, end_time,
    is_break, created_at, updated_at
  )
  select
    period.id,
    period.school_id,
    period.semester_id,
    period.period_number,
    period.name,
    period.start_time,
    period.end_time,
    period.is_break,
    period.created_at,
    period.updated_at
  from jsonb_to_recordset(sync_run.before_periods) as period(
    id uuid,
    school_id uuid,
    semester_id uuid,
    period_number integer,
    name text,
    start_time time,
    end_time time,
    is_break boolean,
    created_at timestamptz,
    updated_at timestamptz
  );
  get diagnostics restored_periods = row_count;

  update public.teaching_schedules schedule
  set
    start_time = snapshot.start_time,
    end_time = snapshot.end_time,
    schedule_period_id = snapshot.schedule_period_id
  from jsonb_to_recordset(sync_run.before_schedules) as snapshot(
    id uuid,
    start_time time,
    end_time time,
    schedule_period_id uuid
  )
  where schedule.id = snapshot.id;

  update public.classroom_schedule_approvals approval
  set
    status = snapshot.status,
    submitted_by = snapshot.submitted_by,
    submitted_at = snapshot.submitted_at,
    approved_by = snapshot.approved_by,
    approved_at = snapshot.approved_at,
    canceled_by = snapshot.canceled_by,
    canceled_at = snapshot.canceled_at,
    signature_url = snapshot.signature_url,
    signature_path = snapshot.signature_path,
    signature_signed_at = snapshot.signature_signed_at,
    submitter_signature_url = snapshot.submitter_signature_url,
    submitter_signature_path = snapshot.submitter_signature_path,
    submitter_signature_signed_at = snapshot.submitter_signature_signed_at
  from jsonb_to_recordset(sync_run.before_approvals) as snapshot(
    id uuid,
    status text,
    submitted_by uuid,
    submitted_at timestamptz,
    approved_by uuid,
    approved_at timestamptz,
    canceled_by uuid,
    canceled_at timestamptz,
    signature_url text,
    signature_path text,
    signature_signed_at timestamptz,
    submitter_signature_url text,
    submitter_signature_path text,
    submitter_signature_signed_at timestamptz
  )
  where approval.id = snapshot.id;

  update public.school_period_sync_runs
  set undone_at = now(), undone_by = actor_id
  where id = sync_run.id;

  return jsonb_build_object(
    'restoredPeriods', restored_periods,
    'syncRunId', sync_run.id
  );
end;
$$;

revoke execute on function public.sync_school_periods_to_semester_with_snapshot(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.sync_school_periods_to_semester_with_snapshot(uuid, uuid, uuid)
  to service_role;

revoke execute on function public.undo_school_period_sync(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.undo_school_period_sync(uuid, uuid, uuid)
  to service_role;
