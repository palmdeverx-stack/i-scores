-- Let admins choose whether a holiday's announcement posts ทันที
-- (immediately, on save) or ตั้งเวลา (scheduled — the existing notice_days
-- countdown handled by the daily cron).
alter table public.school_holidays
  add column if not exists announce_mode text not null default 'scheduled';

alter table public.school_holidays
  drop constraint if exists school_holidays_announce_mode_check;

alter table public.school_holidays
  add constraint school_holidays_announce_mode_check
    check (announce_mode in ('immediate', 'scheduled'));

comment on column public.school_holidays.announce_mode is
  'immediate = announcement created on save; scheduled = created by cron notice_days before holiday_date';
