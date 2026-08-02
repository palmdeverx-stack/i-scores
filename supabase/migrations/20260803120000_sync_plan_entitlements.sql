-- Editing a plan must update the entitlements already issued from that plan.
-- Keep this in one transaction so the catalog and active access never diverge.

create or replace function public.update_subscription_plan_with_entitlements(
  p_plan_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_target_scope text,
  p_billing_cycle text,
  p_price numeric,
  p_currency text,
  p_max_school_admins integer,
  p_max_teachers integer,
  p_max_students integer,
  p_max_line_notifications integer,
  p_enabled_features text[],
  p_source_bundles jsonb,
  p_is_active boolean,
  p_sort_order integer
)
returns public.subscription_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan public.subscription_plans%rowtype;
  updated_plan public.subscription_plans%rowtype;
  linked_product_ids uuid[];
begin
  select *
  into current_plan
  from public.subscription_plans
  where id = p_plan_id
  for update;

  if current_plan.id is null then
    raise exception 'Subscription plan not found';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into linked_product_ids
  from public.marketplace_products
  where grants_plan_code = current_plan.code;

  update public.subscription_plans
  set
    code = p_code,
    name = p_name,
    description = p_description,
    target_scope = p_target_scope,
    billing_cycle = p_billing_cycle,
    price = p_price,
    currency = p_currency,
    max_school_admins = p_max_school_admins,
    max_teachers = p_max_teachers,
    max_students = p_max_students,
    max_line_notifications = p_max_line_notifications,
    enabled_features = p_enabled_features,
    source_bundles = p_source_bundles,
    is_active = p_is_active,
    sort_order = p_sort_order
  where id = p_plan_id
  returning * into updated_plan;

  update public.marketplace_products
  set
    grants_plan_code = p_code,
    grants_feature_key = p_enabled_features[1],
    grants_feature_keys = p_enabled_features,
    license_max_school_admins = p_max_school_admins,
    license_max_teachers = p_max_teachers,
    license_max_students = p_max_students,
    license_line_quota = p_max_line_notifications
  where id = any(linked_product_ids);

  update public.marketplace_user_licenses
  set
    grants_plan_code = p_code,
    feature_keys = p_enabled_features
  where status = 'active'
    and (
      grants_plan_code = current_plan.code
      or product_id = any(linked_product_ids)
    );

  update public.marketplace_school_licenses
  set
    grants_plan_code = p_code,
    feature_keys = p_enabled_features,
    max_school_admins = p_max_school_admins,
    max_teachers = p_max_teachers,
    max_students = p_max_students,
    line_quota = p_max_line_notifications
  where status = 'active'
    and (
      grants_plan_code = current_plan.code
      or product_id = any(linked_product_ids)
    );

  -- Legacy subscriptions predate plan IDs and retain the plan name as their link.
  update public.school_subscriptions
  set
    plan_name = p_name,
    max_school_admins = p_max_school_admins,
    max_teachers = p_max_teachers,
    max_students = p_max_students,
    max_line_notifications = p_max_line_notifications,
    enabled_features = p_enabled_features
  where plan_name = current_plan.name
    and status in ('trialing', 'active');

  return updated_plan;
end;
$$;

revoke all on function public.update_subscription_plan_with_entitlements(
  uuid, text, text, text, text, text, numeric, text,
  integer, integer, integer, integer, text[], jsonb, boolean, integer
) from public;
grant execute on function public.update_subscription_plan_with_entitlements(
  uuid, text, text, text, text, text, numeric, text,
  integer, integer, integer, integer, text[], jsonb, boolean, integer
) to service_role;

