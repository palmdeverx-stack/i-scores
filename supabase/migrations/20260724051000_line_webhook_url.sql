-- Optional public callback URL shown to the school administrator. This allows
-- a deployment domain or HTTPS proxy to be changed without changing school data.

alter table public.school_line_integrations
  add column if not exists webhook_url text;
