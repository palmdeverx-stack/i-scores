-- Register newly package-controlled modules without removing access from
-- existing schools or existing plan templates.

update public.subscription_plans plan
set enabled_features = array(
  select distinct feature
  from unnest(
    plan.enabled_features ||
    array[
      'admin.departments',
      'admin.access_permissions',
      'admin.staff_masters',
      'academic.schedule_workflow',
      'academic.grade_workflow',
      'academic.documents'
    ]::text[]
  ) as feature
);

update public.school_subscriptions subscription
set enabled_features = array(
  select distinct feature
  from unnest(
    subscription.enabled_features ||
    array[
      'admin.departments',
      'admin.access_permissions',
      'admin.staff_masters',
      'academic.schedule_workflow',
      'academic.grade_workflow',
      'academic.documents'
    ]::text[]
  ) as feature
);
