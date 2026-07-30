-- Replace the relative notice_days schedule with an exact date and time.
-- Existing schedules are preserved at 09:00 Asia/Bangkok on their calculated
-- notice date so deployed data continues to be announced.
alter table public.school_holidays
  add column if not exists announcement_at timestamptz;

update public.school_holidays
set announcement_at =
  ((holiday_date - notice_days) + time '09:00') at time zone 'Asia/Bangkok'
where announce_mode = 'scheduled'
  and notice_days is not null
  and announcement_at is null;

create index if not exists school_holidays_pending_announcement_idx
  on public.school_holidays (announcement_at)
  where announce_mode = 'scheduled' and announcement_id is null;

comment on column public.school_holidays.announcement_at is
  'Exact time to auto-post a scheduled holiday announcement; null for immediate announcements';
