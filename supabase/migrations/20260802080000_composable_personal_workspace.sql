-- Every individual package that grants E-KRU features is provisioned into one
-- buyer-owned personal tenant. Packages/licenses remain independent, but their
-- active feature keys are unioned by the existing entitlement loader.

insert into public.ekru_apps (
  code,
  name,
  launch_path,
  required_feature_key,
  supported_scope,
  is_active
)
values (
  'PERSONAL_SUITE',
  'E-KRU Personal',
  '/apps/personal-suite',
  'personal.workspace',
  'school',
  true
)
on conflict (code) do update
set
  name = excluded.name,
  launch_path = excluded.launch_path,
  required_feature_key = excluded.required_feature_key,
  supported_scope = excluded.supported_scope,
  is_active = excluded.is_active;

create or replace function public.provision_personal_workspace_purchase(
  p_order_item_id uuid,
  p_buyer_auth_user_id uuid,
  p_plan_code text,
  p_feature_keys text[],
  p_expires_at timestamptz,
  p_school_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  buyer_record public.marketplace_users%rowtype;
  order_record public.marketplace_orders%rowtype;
  item_record public.marketplace_order_items%rowtype;
  product_record public.marketplace_products%rowtype;
  app_record public.ekru_apps%rowtype;
  event_record public.marketplace_provision_events%rowtype;
  workspace_record public.ekru_app_workspaces%rowtype;
  app_user_record public.app_users%rowtype;
  requested_hash text;
  allowed_features text[];
  duration_days integer;
  generated_username text;
begin
  if p_expires_at <= now() then
    raise exception 'License expiration must be in the future';
  end if;
  if coalesce(array_length(p_feature_keys, 1), 0) = 0 then
    raise exception 'At least one feature key is required';
  end if;

  requested_hash := encode(
    digest(
      concat_ws(
        '|',
        p_order_item_id::text,
        p_buyer_auth_user_id::text,
        'school',
        p_plan_code,
        array_to_string(p_feature_keys, ','),
        p_expires_at::text,
        p_school_id::text,
        '',
        ''
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtextextended(p_order_item_id::text, 0));

  select * into event_record
  from public.marketplace_provision_events
  where order_item_id = p_order_item_id;

  if event_record.order_item_id is not null then
    if event_record.payload_hash <> requested_hash then
      raise exception 'Idempotency key was already used with a different payload';
    end if;
    return jsonb_build_object(
      'workspaceId', event_record.workspace_id,
      'schoolId', event_record.school_id,
      'launchUrl', '/apps/personal-suite',
      'idempotentReplay', true
    );
  end if;

  select * into buyer_record
  from public.marketplace_users
  where auth_user_id = p_buyer_auth_user_id and is_active = true;
  if buyer_record.id is null then
    raise exception 'Active Marketplace buyer was not found';
  end if;

  if not exists (
    select 1 from public.schools
    where id = p_school_id
      and workspace_type = 'personal'
      and owner_auth_user_id = p_buyer_auth_user_id
  ) then
    raise exception 'Personal workspace does not belong to this buyer';
  end if;

  select oi.* into item_record
  from public.marketplace_order_items oi
  join public.marketplace_orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
    and o.buyer_id = buyer_record.id
    and o.status in ('paid', 'completed');
  if item_record.id is null then
    raise exception 'Paid order item does not belong to this buyer';
  end if;

  select * into order_record
  from public.marketplace_orders
  where id = item_record.order_id;

  select * into product_record
  from public.marketplace_products
  where id = item_record.product_id;
  if product_record.id is null then
    raise exception 'Marketplace product was not found';
  end if;

  allowed_features := coalesce(product_record.grants_feature_keys, array[]::text[]);
  if product_record.grants_feature_key is not null then
    allowed_features := array_append(allowed_features, product_record.grants_feature_key);
  end if;
  if exists (
    select 1 from unnest(p_feature_keys) requested_feature
    where not (requested_feature = any(allowed_features))
  ) then
    raise exception 'Requested feature is not granted by the purchased product';
  end if;
  if product_record.grants_plan_code is not null
    and product_record.grants_plan_code <> p_plan_code then
    raise exception 'Requested plan does not match the purchased product';
  end if;

  select * into app_record
  from public.ekru_apps
  where code = 'PERSONAL_SUITE' and is_active = true;
  if app_record.id is null then
    raise exception 'Personal suite app is not active';
  end if;

  select * into app_user_record
  from public.app_users
  where auth_user_id = p_buyer_auth_user_id
    and school_id = p_school_id;

  if app_user_record.id is null then
    generated_username := 'workspace_'
      || replace(left(p_buyer_auth_user_id::text, 8), '-', '')
      || '_'
      || replace(left(p_school_id::text, 8), '-', '');
    insert into public.app_users (
      username, password_hash, email, first_name, last_name, role, school_id,
      is_active, auth_user_id, auth_login_email, auth_role, auth_migrated_at
    )
    values (
      generated_username,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      buyer_record.email,
      buyer_record.first_name,
      buyer_record.last_name,
      'teacher',
      p_school_id,
      true,
      p_buyer_auth_user_id,
      buyer_record.email,
      'teacher',
      now()
    )
    returning * into app_user_record;
  else
    update public.app_users
    set role = 'teacher', auth_role = 'teacher', is_active = true
    where id = app_user_record.id
    returning * into app_user_record;
  end if;

  update public.schools
  set created_by = coalesce(created_by, app_user_record.id)
  where id = p_school_id;

  insert into public.marketplace_school_members (
    school_id, marketplace_user_id, membership_role
  )
  values (p_school_id, buyer_record.id, 'school_admin')
  on conflict (school_id, marketplace_user_id)
  do update set membership_role = 'school_admin';

  if exists (
    select 1 from public.marketplace_school_licenses
    where order_item_id = p_order_item_id
  ) then
    raise exception 'Order item already has a workspace license without a provision event';
  end if;

  duration_days := greatest(
    1,
    ceil(extract(epoch from (p_expires_at - now())) / 86400)::integer
  );

  insert into public.marketplace_school_licenses (
    school_id, product_id, order_id, order_item_id, license_scope,
    feature_keys, seat_count, starts_at, expires_at, status, grants_plan_code,
    max_teachers, max_students, max_school_admins, line_quota, duration_days
  )
  values (
    p_school_id,
    product_record.id,
    order_record.id,
    item_record.id,
    'school',
    p_feature_keys,
    greatest(coalesce(product_record.license_seat_count, 0), 0),
    now(),
    p_expires_at,
    'active',
    p_plan_code,
    coalesce(product_record.license_max_teachers, 0),
    coalesce(product_record.license_max_students, 0),
    coalesce(product_record.license_max_school_admins, 0),
    coalesce(product_record.license_line_quota, 0),
    duration_days
  );

  update public.marketplace_orders
  set license_school_id = p_school_id
  where id = order_record.id;

  insert into public.ekru_app_workspaces (
    app_id, school_id, created_from_order_item_id
  )
  values (app_record.id, p_school_id, p_order_item_id)
  on conflict (app_id, school_id) where school_id is not null
  do update set status = 'active'
  returning * into workspace_record;

  insert into public.marketplace_provision_events (
    order_item_id, buyer_auth_user_id, license_scope, plan_code, feature_keys,
    requested_expires_at, payload_hash, workspace_id, school_id
  )
  values (
    p_order_item_id, p_buyer_auth_user_id, 'school', p_plan_code, p_feature_keys,
    p_expires_at, requested_hash, workspace_record.id, p_school_id
  );

  return jsonb_build_object(
    'workspaceId', workspace_record.id,
    'schoolId', p_school_id,
    'launchUrl', app_record.launch_path,
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.provision_personal_workspace_purchase(
  uuid, uuid, text, text[], timestamptz, uuid
) from public;
grant execute on function public.provision_personal_workspace_purchase(
  uuid, uuid, text, text[], timestamptz, uuid
) to service_role;
