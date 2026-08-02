-- Bundle-backed plans use the union of their selected bundle snapshots as the
-- authoritative feature set. Repair plans saved by the previous UI, which
-- could retain removed standalone features after a bundle was reduced.

do $$
declare
  plan_record public.subscription_plans%rowtype;
  bundle_features text[];
begin
  for plan_record in
    select *
    from public.subscription_plans
    where jsonb_typeof(source_bundles) = 'array'
      and jsonb_array_length(source_bundles) > 0
  loop
    select coalesce(array_agg(distinct feature_key order by feature_key), array[]::text[])
    into bundle_features
    from jsonb_array_elements(plan_record.source_bundles) as bundle(snapshot)
    cross join lateral jsonb_array_elements_text(
      coalesce(bundle.snapshot -> 'featureKeys', '[]'::jsonb)
    ) as feature(feature_key);

    if coalesce(array_length(bundle_features, 1), 0) > 0
      and not (
        plan_record.enabled_features @> bundle_features
        and bundle_features @> plan_record.enabled_features
      )
    then
      perform public.update_subscription_plan_with_entitlements(
        plan_record.id,
        plan_record.code,
        plan_record.name,
        plan_record.description,
        plan_record.target_scope,
        plan_record.billing_cycle,
        plan_record.price,
        plan_record.currency,
        plan_record.max_school_admins,
        plan_record.max_teachers,
        plan_record.max_students,
        plan_record.max_line_notifications,
        bundle_features,
        plan_record.source_bundles,
        plan_record.is_active,
        plan_record.sort_order
      );
    end if;
  end loop;
end;
$$;
