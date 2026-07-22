-- Keep a recoverable copy of student login passwords for school administrators.
-- Values are encrypted by the application before being stored. Existing users
-- remain null because password hashes cannot be reversed.
alter table public.app_users
  add column if not exists password_ciphertext text;
