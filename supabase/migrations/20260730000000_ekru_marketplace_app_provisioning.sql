-- E-KRU-owned application catalog, workspaces and idempotent Marketplace provisioning.

create table if not exists public.ekru_apps (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_]+$'),
  name text not null,
  launch_path text not null check (launch_path like '/apps/%'),
  required_feature_key text not null unique,
  supported_scope text not null
    check (supported_scope in ('individual', 'school', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ekru_app_workspaces (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.ekru_apps(id) on delete restrict,
  owner_auth_user_id uuid references auth.users(id) on delete restrict,
  school_id uuid references public.schools(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_from_order_item_id uuid
    references public.marketplace_order_items(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (owner_auth_user_id is not null and school_id is null)
    or (owner_auth_user_id is null and school_id is not null)
  )
);

create unique index if not exists ekru_app_workspaces_personal_key
  on public.ekru_app_workspaces (app_id, owner_auth_user_id)
  where owner_auth_user_id is not null;

create unique index if not exists ekru_app_workspaces_school_key
  on public.ekru_app_workspaces (app_id, school_id)
  where school_id is not null;

create table if not exists public.marketplace_provision_events (
  order_item_id uuid primary key
    references public.marketplace_order_items(id) on delete restrict,
  buyer_auth_user_id uuid not null references auth.users(id) on delete restrict,
  license_scope text not null check (license_scope in ('individual', 'school')),
  plan_code text not null,
  feature_keys text[] not null,
  requested_expires_at timestamptz not null,
  payload_hash text not null,
  workspace_id uuid not null references public.ekru_app_workspaces(id) on delete restrict,
  school_id uuid references public.schools(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'refunded')),
  status_reason text,
  provisioned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_user_licenses
  drop constraint if exists marketplace_user_licenses_status_check;
alter table public.marketplace_user_licenses
  add constraint marketplace_user_licenses_status_check
  check (status in ('active', 'expired', 'revoked', 'refunded'));

alter table public.marketplace_school_licenses
  drop constraint if exists marketplace_school_licenses_status_check;
alter table public.marketplace_school_licenses
  add constraint marketplace_school_licenses_status_check
  check (status in ('active', 'expired', 'revoked', 'refunded'));

alter table public.ekru_apps enable row level security;
alter table public.ekru_app_workspaces enable row level security;
alter table public.marketplace_provision_events enable row level security;

drop trigger if exists set_ekru_apps_updated_at on public.ekru_apps;
create trigger set_ekru_apps_updated_at
  before update on public.ekru_apps
  for each row execute function public.handle_updated_at();

drop trigger if exists set_ekru_app_workspaces_updated_at on public.ekru_app_workspaces;
create trigger set_ekru_app_workspaces_updated_at
  before update on public.ekru_app_workspaces
  for each row execute function public.handle_updated_at();

drop trigger if exists set_marketplace_provision_events_updated_at
  on public.marketplace_provision_events;
create trigger set_marketplace_provision_events_updated_at
  before update on public.marketplace_provision_events
  for each row execute function public.handle_updated_at();

insert into public.ekru_apps (
  code,
  name,
  launch_path,
  required_feature_key,
  supported_scope
)
values (
  'WORKSHEET_AI',
  'Worksheet AI',
  '/apps/worksheet-ai',
  'teacher.worksheet_ai',
  'individual'
)
on conflict (code) do nothing;

create or replace function public.provision_marketplace_purchase(
  p_order_item_id uuid,
  p_buyer_auth_user_id uuid,
  p_license_scope text,
  p_plan_code text,
  p_feature_keys text[],
  p_expires_at timestamptz,
  p_school_id uuid default null,
  p_school_name text default null,
  p_school_code text default null
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
  resolved_school_id uuid := p_school_id;
  requested_hash text;
  allowed_features text[];
  duration_days integer;
  generated_username text;
  is_new_school boolean := false;
begin
  if p_license_scope not in ('individual', 'school') then
    raise exception 'Unsupported license scope';
  end if;
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
        p_license_scope,
        p_plan_code,
        array_to_string(p_feature_keys, ','),
        p_expires_at::text,
        coalesce(p_school_id::text, ''),
        coalesce(p_school_name, ''),
        coalesce(p_school_code, '')
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtextextended(p_order_item_id::text, 0));

  select *
  into event_record
  from public.marketplace_provision_events
  where order_item_id = p_order_item_id;

  if event_record.order_item_id is not null then
    if event_record.payload_hash <> requested_hash then
      raise exception 'Idempotency key was already used with a different payload';
    end if;

    select *
    into app_record
    from public.ekru_apps
    where id = (
      select app_id
      from public.ekru_app_workspaces
      where id = event_record.workspace_id
    );

    return jsonb_build_object(
      'workspaceId', event_record.workspace_id,
      'schoolId', event_record.school_id,
      'launchUrl', app_record.launch_path,
      'idempotentReplay', true
    );
  end if;

  select *
  into buyer_record
  from public.marketplace_users
  where auth_user_id = p_buyer_auth_user_id
    and is_active = true;
  if buyer_record.id is null then
    raise exception 'Active Marketplace buyer was not found';
  end if;

  select oi.*
  into item_record
  from public.marketplace_order_items oi
  join public.marketplace_orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
    and o.buyer_id = buyer_record.id
    and o.status in ('paid', 'completed');
  if item_record.id is null then
    raise exception 'Paid order item does not belong to this buyer';
  end if;

  select *
  into order_record
  from public.marketplace_orders
  where id = item_record.order_id;

  select *
  into product_record
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
    select 1
    from unnest(p_feature_keys) requested_feature
    where not (requested_feature = any(allowed_features))
  ) then
    raise exception 'Requested feature is not granted by the purchased product';
  end if;
  if product_record.grants_plan_code is not null
    and product_record.grants_plan_code <> p_plan_code then
    raise exception 'Requested plan does not match the purchased product';
  end if;

  select *
  into app_record
  from public.ekru_apps
  where required_feature_key = any(p_feature_keys)
    and is_active = true
    and (
      supported_scope = 'both'
      or supported_scope = p_license_scope
    )
  order by code
  limit 1;
  if app_record.id is null then
    raise exception 'No active E-KRU app matches this feature and scope';
  end if;

  duration_days := greatest(
    1,
    ceil(extract(epoch from (p_expires_at - now())) / 86400)::integer
  );

  if p_license_scope = 'individual' then
    if exists (
      select 1
      from public.marketplace_user_licenses
      where order_item_id = p_order_item_id
    ) then
      raise exception 'Order item already has an individual license without a provision event';
    end if;

    insert into public.marketplace_user_licenses (
      buyer_id,
      product_id,
      order_id,
      order_item_id,
      feature_keys,
      grants_plan_code,
      duration_days,
      starts_at,
      expires_at,
      status
    )
    values (
      buyer_record.id,
      product_record.id,
      order_record.id,
      item_record.id,
      p_feature_keys,
      p_plan_code,
      duration_days,
      now(),
      p_expires_at,
      'active'
    );

    insert into public.ekru_app_workspaces (
      app_id,
      owner_auth_user_id,
      created_from_order_item_id
    )
    values (
      app_record.id,
      p_buyer_auth_user_id,
      p_order_item_id
    )
    on conflict (app_id, owner_auth_user_id)
      where owner_auth_user_id is not null
    do update set status = 'active'
    returning * into workspace_record;
  else
    if resolved_school_id is null then
      resolved_school_id := order_record.license_school_id;
    end if;

    if resolved_school_id is null then
      if p_school_name is null or btrim(p_school_name) = ''
        or p_school_code is null or p_school_code !~ '^[0-9]{8}$' then
        raise exception 'New school name and 8-digit school code are required';
      end if;

      insert into public.schools (name, code, email)
      values (btrim(p_school_name), p_school_code, buyer_record.email)
      returning id into resolved_school_id;
      is_new_school := true;
    end if;

    select *
    into app_user_record
    from public.app_users
    where auth_user_id = p_buyer_auth_user_id;

    if app_user_record.id is not null
      and app_user_record.school_id is not null
      and app_user_record.school_id <> resolved_school_id then
      raise exception 'Buyer is already linked to another school';
    end if;

    if app_user_record.id is null then
      generated_username := 'marketplace_' || replace(left(p_buyer_auth_user_id::text, 8), '-', '');
      insert into public.app_users (
        username,
        password_hash,
        email,
        first_name,
        last_name,
        role,
        school_id,
        is_active,
        auth_user_id,
        auth_login_email,
        auth_role,
        auth_migrated_at
      )
      values (
        generated_username,
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        buyer_record.email,
        buyer_record.first_name,
        buyer_record.last_name,
        'school_admin',
        resolved_school_id,
        true,
        p_buyer_auth_user_id,
        buyer_record.email,
        'school_admin',
        now()
      )
      returning * into app_user_record;
    else
      update public.app_users
      set
        school_id = resolved_school_id,
        role = 'school_admin',
        auth_role = 'school_admin',
        is_active = true
      where id = app_user_record.id
      returning * into app_user_record;
    end if;

    if is_new_school then
      update public.schools
      set created_by = app_user_record.id
      where id = resolved_school_id;

      insert into public.departments (school_id, name, description)
      values
        (resolved_school_id, 'ฝ่ายวิชาการ', 'การเรียนการสอน'),
        (resolved_school_id, 'ฝ่ายกิจการนักเรียน', 'ดูแลนักเรียน'),
        (resolved_school_id, 'ฝ่ายบริหารทั่วไป', 'งานธุรการ'),
        (resolved_school_id, 'ฝ่ายงบประมาณ', 'การเงิน'),
        (resolved_school_id, 'ฝ่ายสัมพันธ์ชุมชน', 'ผู้ปกครอง')
      on conflict do nothing;
    end if;

    insert into public.marketplace_school_members (
      school_id,
      marketplace_user_id,
      membership_role
    )
    values (
      resolved_school_id,
      buyer_record.id,
      'school_admin'
    )
    on conflict (school_id, marketplace_user_id)
    do update set membership_role = 'school_admin';

    if exists (
      select 1
      from public.marketplace_school_licenses
      where order_item_id = p_order_item_id
    ) then
      raise exception 'Order item already has a school license without a provision event';
    end if;

    insert into public.marketplace_school_licenses (
      school_id,
      product_id,
      order_id,
      order_item_id,
      license_scope,
      feature_keys,
      seat_count,
      starts_at,
      expires_at,
      status,
      grants_plan_code,
      max_teachers,
      max_students,
      max_school_admins,
      line_quota,
      duration_days
    )
    values (
      resolved_school_id,
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
    set license_school_id = resolved_school_id
    where id = order_record.id;

    insert into public.ekru_app_workspaces (
      app_id,
      school_id,
      created_from_order_item_id
    )
    values (
      app_record.id,
      resolved_school_id,
      p_order_item_id
    )
    on conflict (app_id, school_id)
      where school_id is not null
    do update set status = 'active'
    returning * into workspace_record;
  end if;

  insert into public.marketplace_provision_events (
    order_item_id,
    buyer_auth_user_id,
    license_scope,
    plan_code,
    feature_keys,
    requested_expires_at,
    payload_hash,
    workspace_id,
    school_id
  )
  values (
    p_order_item_id,
    p_buyer_auth_user_id,
    p_license_scope,
    p_plan_code,
    p_feature_keys,
    p_expires_at,
    requested_hash,
    workspace_record.id,
    resolved_school_id
  );

  return jsonb_build_object(
    'workspaceId', workspace_record.id,
    'schoolId', resolved_school_id,
    'launchUrl', app_record.launch_path,
    'onboardingUrl',
      case when is_new_school then '/onboarding/school' else null end,
    'idempotentReplay', false
  );
end;
$$;

create or replace function public.update_marketplace_provision_status(
  p_order_item_id uuid,
  p_status text,
  p_reason text default null,
  p_grace_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.marketplace_provision_events%rowtype;
  effective_expiration timestamptz;
  effective_license_status text;
begin
  if p_status not in ('expired', 'revoked', 'refunded') then
    raise exception 'Unsupported terminal license status';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_order_item_id::text, 0));

  select *
  into event_record
  from public.marketplace_provision_events
  where order_item_id = p_order_item_id
  for update;
  if event_record.order_item_id is null then
    raise exception 'Provision event was not found';
  end if;

  effective_expiration :=
    case
      when p_grace_until is not null and p_grace_until > now() then p_grace_until
      else now()
    end;
  effective_license_status :=
    case
      when effective_expiration > now() then 'active'
      else p_status
    end;

  update public.marketplace_provision_events
  set status = p_status, status_reason = p_reason
  where order_item_id = p_order_item_id;

  if event_record.license_scope = 'individual' then
    update public.marketplace_user_licenses
    set
      status = effective_license_status,
      expires_at = least(expires_at, effective_expiration),
      revoked_at = case when p_status in ('revoked', 'refunded') then now() else revoked_at end,
      revoke_reason = p_reason
    where order_item_id = p_order_item_id;
  else
    update public.marketplace_school_licenses
    set
      status = effective_license_status,
      expires_at = least(expires_at, effective_expiration),
      revoked_at = case when p_status in ('revoked', 'refunded') then now() else revoked_at end,
      revoke_reason = p_reason
    where order_item_id = p_order_item_id;
  end if;

  return jsonb_build_object(
    'workspaceId', event_record.workspace_id,
    'status', p_status,
    'accessEndsAt', effective_expiration
  );
end;
$$;

revoke all on function public.provision_marketplace_purchase(
  uuid, uuid, text, text, text[], timestamptz, uuid, text, text
) from public;
revoke all on function public.update_marketplace_provision_status(
  uuid, text, text, timestamptz
) from public;
grant execute on function public.provision_marketplace_purchase(
  uuid, uuid, text, text, text[], timestamptz, uuid, text, text
) to service_role;
grant execute on function public.update_marketplace_provision_status(
  uuid, text, text, timestamptz
) to service_role;
