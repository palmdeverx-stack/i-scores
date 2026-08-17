alter table public.school_duty_schedules
  add column if not exists recurrence_group_id uuid,
  add column if not exists recurrence_weekdays smallint[],
  add column if not exists recurrence_until date;

alter table public.school_duty_schedules
  add constraint school_duty_schedules_recurrence_check check (
    (recurrence_group_id is null and recurrence_weekdays is null and recurrence_until is null)
    or
    (
      recurrence_group_id is not null
      and cardinality(recurrence_weekdays) between 1 and 7
      and recurrence_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      and recurrence_until >= duty_date
    )
  );

create index if not exists school_duty_schedules_recurrence_group_idx
  on public.school_duty_schedules (recurrence_group_id, duty_date)
  where recurrence_group_id is not null;

create or replace function public.save_school_duty_schedule_series(
  target_school_id uuid,
  target_schedule_id uuid,
  actor_id uuid,
  target_duty_date date,
  target_shift text,
  target_starts_at time,
  target_ends_at time,
  target_location text,
  target_note text,
  target_staff_ids uuid[],
  target_weekdays smallint[],
  target_repeat_until date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_schedule public.school_duty_schedules%rowtype;
  series_group_id uuid;
  effective_until date;
  effective_weekdays smallint[];
  created_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_school_id::text || ':duty-roster', 0));

  if target_ends_at <= target_starts_at then
    raise exception 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม';
  end if;

  if target_repeat_until is not null then
    if target_repeat_until < target_duty_date
      or target_repeat_until > target_duty_date + 366
      or cardinality(target_weekdays) not between 1 and 7
      or not target_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    then
      raise exception 'ข้อมูลการทำซ้ำไม่ถูกต้อง';
    end if;
    series_group_id := gen_random_uuid();
    effective_until := target_repeat_until;
    effective_weekdays := target_weekdays;
  else
    series_group_id := null;
    effective_until := target_duty_date;
    effective_weekdays := array[extract(dow from target_duty_date)::smallint];
  end if;

  if target_schedule_id is not null then
    select * into existing_schedule
    from public.school_duty_schedules schedule
    where schedule.id = target_schedule_id
      and schedule.school_id = target_school_id
    for update;

    if existing_schedule.id is null then
      raise exception 'ไม่พบตารางเวร';
    end if;

    if existing_schedule.recurrence_group_id is null then
      delete from public.school_duty_schedules where id = existing_schedule.id;
    else
      delete from public.school_duty_schedules
      where recurrence_group_id = existing_schedule.recurrence_group_id
        and duty_date >= existing_schedule.duty_date;
    end if;
  end if;

  with occurrences as (
    select occurrence::date as duty_date
    from generate_series(
      target_duty_date::timestamp,
      effective_until::timestamp,
      interval '1 day'
    ) occurrence
    where extract(dow from occurrence)::smallint = any(effective_weekdays)
  ), inserted as (
    insert into public.school_duty_schedules (
      school_id,
      duty_date,
      shift,
      starts_at,
      ends_at,
      location,
      note,
      created_by,
      recurrence_group_id,
      recurrence_weekdays,
      recurrence_until
    )
    select
      target_school_id,
      occurrence.duty_date,
      target_shift,
      target_starts_at,
      target_ends_at,
      target_location,
      target_note,
      actor_id,
      series_group_id,
      case when series_group_id is null then null else effective_weekdays end,
      case when series_group_id is null then null else effective_until end
    from occurrences occurrence
    returning id
  ), assigned as (
    insert into public.school_duty_assignees (schedule_id, staff_id)
    select inserted.id, staff.staff_id
    from inserted
    cross join unnest(target_staff_ids) as staff(staff_id)
    returning schedule_id
  )
  select count(distinct schedule_id) into created_count from assigned;

  if created_count = 0 then
    raise exception 'ช่วงวันที่เลือกไม่มีวันที่ตรงกับวันทำซ้ำ';
  end if;

  return jsonb_build_object('created', created_count);
end;
$$;

revoke execute on function public.save_school_duty_schedule_series(
  uuid, uuid, uuid, date, text, time, time, text, text, uuid[], smallint[], date
) from public, anon, authenticated;
grant execute on function public.save_school_duty_schedule_series(
  uuid, uuid, uuid, date, text, time, time, text, text, uuid[], smallint[], date
) to service_role;
