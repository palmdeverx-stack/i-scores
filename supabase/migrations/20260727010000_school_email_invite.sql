-- Schools now collect a contact email at creation time, used to send the
-- new school_admin their login invite. Nullable: existing schools were
-- created before this column existed.
alter table public.schools
  add column email text;
