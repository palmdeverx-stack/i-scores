-- Make lesson plans independently configurable while preserving access for
-- packages and already-issued entitlements that previously exposed them
-- through teacher.assignments.

update public.subscription_plans
set enabled_features = array_append(enabled_features, 'teacher.lesson_plans')
where enabled_features @> array['teacher.assignments']::text[]
  and not enabled_features @> array['teacher.lesson_plans']::text[];

-- Plans created from capability bundles keep a snapshot. Migrate that snapshot
-- too, otherwise opening and saving an existing plan would remove the new key.
update public.subscription_plans as plan
set source_bundles = (
  select coalesce(
    jsonb_agg(
      case
        when snapshot.value -> 'featureKeys' @> '["teacher.assignments"]'::jsonb
          and not snapshot.value -> 'featureKeys' @> '["teacher.lesson_plans"]'::jsonb
        then jsonb_set(
          snapshot.value,
          '{featureKeys}',
          (snapshot.value -> 'featureKeys') || '["teacher.lesson_plans"]'::jsonb
        )
        else snapshot.value
      end
      order by snapshot.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(plan.source_bundles) with ordinality as snapshot(value, ordinality)
)
where exists (
  select 1
  from jsonb_array_elements(plan.source_bundles) as snapshot(value)
  where snapshot.value -> 'featureKeys' @> '["teacher.assignments"]'::jsonb
    and not snapshot.value -> 'featureKeys' @> '["teacher.lesson_plans"]'::jsonb
);

update public.school_subscriptions
set enabled_features = array_append(enabled_features, 'teacher.lesson_plans')
where enabled_features @> array['teacher.assignments']::text[]
  and not enabled_features @> array['teacher.lesson_plans']::text[];

update public.capability_bundles
set
  feature_keys = array_append(feature_keys, 'teacher.lesson_plans'),
  version = version + 1,
  updated_at = now()
where feature_keys @> array['teacher.assignments']::text[]
  and not feature_keys @> array['teacher.lesson_plans']::text[];

update public.marketplace_products
set grants_feature_keys = array_append(grants_feature_keys, 'teacher.lesson_plans')
where grants_feature_keys @> array['teacher.assignments']::text[]
  and not grants_feature_keys @> array['teacher.lesson_plans']::text[];

update public.marketplace_user_licenses
set feature_keys = array_append(feature_keys, 'teacher.lesson_plans')
where feature_keys @> array['teacher.assignments']::text[]
  and not feature_keys @> array['teacher.lesson_plans']::text[];

update public.marketplace_school_licenses
set feature_keys = array_append(feature_keys, 'teacher.lesson_plans')
where feature_keys @> array['teacher.assignments']::text[]
  and not feature_keys @> array['teacher.lesson_plans']::text[];
