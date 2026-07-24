-- Next.js is configured with trailingSlash=true. LINE does not follow the
-- resulting 308 redirect for webhook verification, so store the canonical URL.

update public.school_line_integrations
set webhook_url = rtrim(webhook_url, '/') || '/'
where webhook_url is not null;
