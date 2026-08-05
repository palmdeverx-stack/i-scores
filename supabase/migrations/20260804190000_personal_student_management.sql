-- Creating a student profile and enrolling that student into a classroom are
-- separate steps. Personal workspaces need the student-management surface in
-- addition to enrollment management so the academic-year flow is complete.

update public.capability_bundles
set
  feature_keys = array(
    select distinct feature_key
    from unnest(feature_keys || array['admin.students']::text[]) as feature_key
  ),
  version = version + 1,
  updated_at = now()
where code in ('PERSONAL_TEACHING', 'PERSONAL_ATTENDANCE', 'PERSONAL_ALL');

update public.subscription_plans
set enabled_features = array(
  select distinct feature_key
  from unnest(enabled_features || array['admin.students']::text[]) as feature_key
)
where target_scope in ('individual', 'both')
  and enabled_features @> array['teacher.manage_enrollments']::text[];

update public.subscription_plans as plan
set source_bundles = (
  select coalesce(
    jsonb_agg(
      case
        when snapshot.value -> 'featureKeys' @> '["teacher.manage_enrollments"]'::jsonb
        then jsonb_set(
          snapshot.value,
          '{featureKeys}',
          (
            select coalesce(jsonb_agg(feature_key), '[]'::jsonb)
            from (
              select jsonb_array_elements_text(snapshot.value -> 'featureKeys') as feature_key
              union
              select 'admin.students'
            ) as feature_keys
          )
        )
        else snapshot.value
      end
      order by snapshot.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(plan.source_bundles) with ordinality as snapshot(value, ordinality)
)
where target_scope in ('individual', 'both')
  and exists (
    select 1
    from jsonb_array_elements(plan.source_bundles) as snapshot(value)
    where snapshot.value -> 'featureKeys' @> '["teacher.manage_enrollments"]'::jsonb
  );

update public.marketplace_products as product
set grants_feature_keys = plan.enabled_features
from public.subscription_plans as plan
where product.grants_plan_code = plan.code
  and plan.target_scope in ('individual', 'both')
  and plan.enabled_features @> array['teacher.manage_enrollments']::text[];

update public.marketplace_user_licenses
set feature_keys = array(
  select distinct feature_key
  from unnest(feature_keys || array['admin.students']::text[]) as feature_key
)
where feature_keys @> array['teacher.manage_enrollments']::text[];
