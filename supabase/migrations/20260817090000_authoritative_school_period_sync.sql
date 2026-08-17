create or replace function public.sync_school_periods_to_semester_authoritative(
  target_school_id uuid,
  target_semester_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sync_result jsonb;
  blocked_periods text;
  deleted_count integer := 0;
begin
  sync_result := public.sync_school_periods_to_semester(
    target_school_id,
    target_semester_id
  );

  select string_agg(period.name, ', ' order by period.start_time)
  into blocked_periods
  from public.schedule_periods period
  where period.school_id = target_school_id
    and period.semester_id = target_semester_id
    and not exists (
      select 1
      from public.school_periods source_period
      where source_period.school_id = target_school_id
        and source_period.is_active = true
        and (
          (
            source_period.period_type = 'class'
            and period.is_break = false
            and period.period_number = source_period.period_number
          )
          or
          (
            source_period.period_type <> 'class'
            and period.is_break = true
            and (
              lower(period.name) = lower(left(source_period.name, 100))
              or (
                period.start_time = source_period.starts_at
                and period.end_time = source_period.ends_at
              )
            )
          )
        )
    )
    and exists (
      select 1 from public.teaching_schedules teaching_schedule
      where teaching_schedule.schedule_period_id = period.id
    );

  if blocked_periods is not null then
    raise exception using
      errcode = 'P0001',
      message = 'พบคาบนอกมาตรฐานที่มีวิชาจัดไว้แล้ว: ' || blocked_periods
        || ' กรุณาย้ายหรือลบคาบสอนเหล่านี้ก่อนซิงค์';
  end if;

  delete from public.schedule_periods period
  where period.school_id = target_school_id
    and period.semester_id = target_semester_id
    and not exists (
      select 1
      from public.school_periods source_period
      where source_period.school_id = target_school_id
        and source_period.is_active = true
        and (
          (
            source_period.period_type = 'class'
            and period.is_break = false
            and period.period_number = source_period.period_number
          )
          or
          (
            source_period.period_type <> 'class'
            and period.is_break = true
            and (
              lower(period.name) = lower(left(source_period.name, 100))
              or (
                period.start_time = source_period.starts_at
                and period.end_time = source_period.ends_at
              )
            )
          )
        )
    );
  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update public.classroom_schedule_approvals
    set
      status = 'draft',
      submitted_by = null,
      submitted_at = null,
      signature_url = null,
      signature_signed_at = null,
      submitter_signature_url = null,
      submitter_signature_signed_at = null
    where school_id = target_school_id
      and semester_id = target_semester_id
      and status in ('submitted', 'approved');
  end if;

  return sync_result || jsonb_build_object('deleted', deleted_count);
end;
$$;

revoke execute on function public.sync_school_periods_to_semester_authoritative(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.sync_school_periods_to_semester_authoritative(uuid, uuid)
  to service_role;
