-- Holiday categorization (หยุดปกติตามราชการ / หยุดด่วน / หยุดพิเศษ) and
-- linkage to an auto-created announcement: when `notice_days` is set, a cron
-- creates a school_announcements row `notice_days` before `holiday_date` and
-- records it here so it's only ever created once per holiday.
alter table public.school_holidays
  add column if not exists holiday_type text not null default 'regular',
  add column if not exists notice_days integer,
  add column if not exists announcement_id uuid references public.school_announcements (id) on delete set null;

alter table public.school_holidays
  drop constraint if exists school_holidays_holiday_type_check;

alter table public.school_holidays
  add constraint school_holidays_holiday_type_check
    check (holiday_type in ('regular', 'urgent', 'special'));

alter table public.school_holidays
  drop constraint if exists school_holidays_notice_days_check;

alter table public.school_holidays
  add constraint school_holidays_notice_days_check
    check (notice_days is null or notice_days >= 0);

comment on column public.school_holidays.holiday_type is
  'regular = หยุดปกติตามราชการ, urgent = หยุดด่วน, special = หยุดพิเศษ';
comment on column public.school_holidays.notice_days is
  'Days before holiday_date to auto-post an announcement; null = no auto announcement';
comment on column public.school_holidays.announcement_id is
  'school_announcements row created for this holiday, once notice_days is reached (null until then)';
