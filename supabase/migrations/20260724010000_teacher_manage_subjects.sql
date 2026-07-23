-- Enable the teacher subject creation feature for plans and schools that
-- already allow teachers to manage academic structure.
update public.subscription_plans
set enabled_features = array_append(enabled_features, 'teacher.manage_subjects')
where enabled_features @> array['teacher.manage_classrooms']::text[]
  and not enabled_features @> array['teacher.manage_subjects']::text[];

update public.school_subscriptions
set enabled_features = array_append(enabled_features, 'teacher.manage_subjects')
where enabled_features @> array['teacher.manage_classrooms']::text[]
  and not enabled_features @> array['teacher.manage_subjects']::text[];
