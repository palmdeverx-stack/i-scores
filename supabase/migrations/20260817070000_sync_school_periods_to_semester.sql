create or replace function public.sync_school_periods_to_semester(
  target_school_id uuid,
  target_semester_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_period public.school_periods%rowtype;
  target_period public.schedule_periods%rowtype;
  resolved_is_break boolean;
  resolved_name text;
  changed boolean;
  created_count integer := 0;
  updated_count integer := 0;
begin
  if not exists (
    select 1
    from public.semesters semester
    join public.academic_years academic_year on academic_year.id = semester.academic_year_id
    where semester.id = target_semester_id
      and academic_year.school_id = target_school_id
  ) then
    raise exception 'ไม่พบภาคเรียนของโรงเรียนนี้';
  end if;

  if not exists (
    select 1 from public.school_periods
    where school_id = target_school_id and is_active = true
  ) then
    raise exception 'ยังไม่มีช่วงเวลามาตรฐานที่เปิดใช้งาน';
  end if;

  if exists (
    select 1
    from public.school_periods first_period
    join public.school_periods second_period
      on first_period.school_id = second_period.school_id
      and first_period.id < second_period.id
      and first_period.starts_at < second_period.ends_at
      and first_period.ends_at > second_period.starts_at
    where first_period.school_id = target_school_id
      and first_period.is_active = true
      and second_period.is_active = true
  ) then
    raise exception 'ช่วงเวลามาตรฐานมีเวลาซ้อนกัน กรุณาแก้ไขก่อนซิงค์';
  end if;

  for source_period in
    select * from public.school_periods
    where school_id = target_school_id and is_active = true
    order by starts_at, period_number
  loop
    resolved_is_break := source_period.period_type <> 'class';
    resolved_name := left(source_period.name, 100);
    target_period := null;

    select period.* into target_period
    from public.schedule_periods period
    where period.school_id = target_school_id
      and period.semester_id = target_semester_id
      and (
        (not resolved_is_break and not period.is_break and period.period_number = source_period.period_number)
        or
        (resolved_is_break and period.is_break and (
          lower(period.name) = lower(resolved_name)
          or (period.start_time = source_period.starts_at and period.end_time = source_period.ends_at)
        ))
      )
    order by period.created_at
    limit 1;

    if target_period.id is null then
      insert into public.schedule_periods (
        school_id, semester_id, period_number, name, start_time, end_time, is_break
      ) values (
        target_school_id,
        target_semester_id,
        case when resolved_is_break then null else source_period.period_number end,
        resolved_name,
        source_period.starts_at,
        source_period.ends_at,
        resolved_is_break
      );
      created_count := created_count + 1;
    else
      changed :=
        target_period.name is distinct from resolved_name
        or target_period.start_time is distinct from source_period.starts_at
        or target_period.end_time is distinct from source_period.ends_at
        or target_period.is_break is distinct from resolved_is_break
        or target_period.period_number is distinct from
          (case when resolved_is_break then null else source_period.period_number end);

      if changed then
        update public.schedule_periods
        set
          period_number = case when resolved_is_break then null else source_period.period_number end,
          name = resolved_name,
          start_time = source_period.starts_at,
          end_time = source_period.ends_at,
          is_break = resolved_is_break
        where id = target_period.id;

        update public.teaching_schedules
        set start_time = source_period.starts_at, end_time = source_period.ends_at
        where schedule_period_id = target_period.id;

        updated_count := updated_count + 1;
      end if;
    end if;
  end loop;

  if created_count > 0 or updated_count > 0 then
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

  return jsonb_build_object('created', created_count, 'updated', updated_count);
end;
$$;

revoke execute on function public.sync_school_periods_to_semester(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.sync_school_periods_to_semester(uuid, uuid)
  to service_role;
