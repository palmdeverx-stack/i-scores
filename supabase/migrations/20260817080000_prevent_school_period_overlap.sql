create or replace function public.prevent_school_period_time_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.school_periods period
    where period.school_id = new.school_id
      and period.id <> new.id
      and period.starts_at < new.ends_at
      and period.ends_at > new.starts_at
  ) then
    raise exception using
      errcode = '23P01',
      message = 'ช่วงเวลานี้ซ้อนกับคาบหรือกิจกรรมที่มีอยู่แล้ว';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_school_period_time_overlap on public.school_periods;
create trigger prevent_school_period_time_overlap
  before insert or update of school_id, starts_at, ends_at
  on public.school_periods
  for each row execute function public.prevent_school_period_time_overlap ();
