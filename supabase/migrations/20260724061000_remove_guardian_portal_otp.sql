-- Parent Portal now authenticates an already-linked LINE guardian by matching
-- the school's student code against that guardian/student relationship.
-- Short-lived OTP records are no longer collected or required.

drop table if exists public.guardian_portal_login_codes;
