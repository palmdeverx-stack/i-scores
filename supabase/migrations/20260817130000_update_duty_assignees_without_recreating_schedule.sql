create or replace function public.update_school_duty_assignees_if_schedule_unchanged(
  target_school_id uuid,
  target_schedule_id uuid,
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
  schedule_ids uuid[];
  recurrence_matches boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_school_id::text || ':duty-roster', 0));

  select * into existing_schedule
  from public.school_duty_schedules schedule
  where schedule.id = target_schedule_id
    and schedule.school_id = target_school_id
  for update;

  if existing_schedule.id is null then
    raise exception 'ไม่พบตารางเวร';
  end if;

  recurrence_matches :=
    (
      existing_schedule.recurrence_group_id is null
      and target_repeat_until is null
    )
    or
    (
      existing_schedule.recurrence_group_id is not null
      and target_repeat_until = existing_schedule.recurrence_until
      and cardinality(target_weekdays) = cardinality(existing_schedule.recurrence_weekdays)
      and target_weekdays @> existing_schedule.recurrence_weekdays
      and target_weekdays <@ existing_schedule.recurrence_weekdays
    );

  if existing_schedule.duty_date <> target_duty_date
    or existing_schedule.shift <> target_shift
    or existing_schedule.starts_at <> target_starts_at
    or existing_schedule.ends_at <> target_ends_at
    or existing_schedule.location <> target_location
    or existing_schedule.note is distinct from target_note
    or not recurrence_matches
  then
    return jsonb_build_object('matched', false, 'updated', 0);
  end if;

  if existing_schedule.recurrence_group_id is null then
    schedule_ids := array[existing_schedule.id];
  else
    select array_agg(schedule.id)
    into schedule_ids
    from public.school_duty_schedules schedule
    where schedule.recurrence_group_id = existing_schedule.recurrence_group_id
      and schedule.duty_date >= existing_schedule.duty_date;
  end if;

  delete from public.school_duty_assignees assignee
  where assignee.schedule_id = any(schedule_ids);

  insert into public.school_duty_assignees (schedule_id, staff_id)
  select schedule_id, staff_id
  from unnest(schedule_ids) as schedules(schedule_id)
  cross join unnest(target_staff_ids) as staff(staff_id);

  return jsonb_build_object(
    'matched', true,
    'updated', cardinality(schedule_ids)
  );
end;
$$;

revoke execute on function public.update_school_duty_assignees_if_schedule_unchanged(
  uuid, uuid, date, text, time, time, text, text, uuid[], smallint[], date
) from public, anon, authenticated;
grant execute on function public.update_school_duty_assignees_if_schedule_unchanged(
  uuid, uuid, date, text, time, time, text, text, uuid[], smallint[], date
) to service_role;
