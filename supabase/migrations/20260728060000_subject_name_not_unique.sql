-- Subject names may repeat within a semester (e.g. duplicating a subject as
-- a starting template creates a "X (สำเนา)" copy that a teacher may later
-- rename back). The subject code — now required and validated at the app
-- layer — remains the unique identifier per semester via the existing
-- subjects_semester_code_key constraint.
drop index if exists public.subjects_semester_name_key;
