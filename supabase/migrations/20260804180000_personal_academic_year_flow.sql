-- Personal workspaces need the management screens behind these feature keys
-- to operate across academic years, classrooms and enrollments. Keep the
-- existing teacher.* shortcuts, but grant the full list/edit surfaces too.

update public.capability_bundles
set
  feature_keys = array(
    select distinct feature_key
    from unnest(
      feature_keys || array[
        'admin.academic_years',
        'admin.classrooms',
        'admin.enrollments'
      ]::text[]
    ) as feature_key
  ),
  version = version + 1,
  updated_at = now()
where code in ('PERSONAL_TEACHING', 'PERSONAL_ATTENDANCE', 'PERSONAL_ALL');

update public.subscription_plans
set enabled_features = array(
  select distinct feature_key
  from unnest(
    enabled_features || array[
      'admin.academic_years',
      'admin.classrooms',
      'admin.enrollments'
    ]::text[]
  ) as feature_key
)
where target_scope in ('individual', 'both')
  and enabled_features @> array['teacher.manage_classrooms']::text[];

update public.subscription_plans as plan
set source_bundles = (
  select coalesce(
    jsonb_agg(
      case
        when snapshot.value -> 'featureKeys' @> '["teacher.manage_classrooms"]'::jsonb
        then jsonb_set(
          snapshot.value,
          '{featureKeys}',
          (
            select coalesce(jsonb_agg(feature_key), '[]'::jsonb)
            from (
              select jsonb_array_elements_text(snapshot.value -> 'featureKeys') as feature_key
              union
              select unnest(array[
                'admin.academic_years',
                'admin.classrooms',
                'admin.enrollments'
              ]::text[])
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
    where snapshot.value -> 'featureKeys' @> '["teacher.manage_classrooms"]'::jsonb
  );

update public.marketplace_products as product
set grants_feature_keys = plan.enabled_features
from public.subscription_plans as plan
where product.grants_plan_code = plan.code
  and plan.target_scope in ('individual', 'both')
  and plan.enabled_features @> array['teacher.manage_classrooms']::text[];

update public.marketplace_user_licenses
set feature_keys = array(
  select distinct feature_key
  from unnest(
    feature_keys || array[
      'admin.academic_years',
      'admin.classrooms',
      'admin.enrollments'
    ]::text[]
  ) as feature_key
)
where feature_keys @> array['teacher.manage_classrooms']::text[];

-- Search teaching classes by the tenant-owned teacher and classroom. The
-- subject itself may now come from the personal/public/system catalog and
-- therefore does not need a school_id.
create or replace function public.search_teacher_assignments(
  p_school_id uuid,
  p_teacher_id uuid default null,
  p_classroom_id uuid default null,
  p_search text default null,
  p_limit int default 12,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  teacher jsonb,
  subject jsonb,
  classroom jsonb,
  semester jsonb,
  total_count bigint
)
language plpgsql
stable
as $$
declare
  v_pattern text := case
    when p_search is null or btrim(p_search) = '' then null
    else '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end;
begin
  return query
  select
    ta.id,
    ta.created_at,
    jsonb_build_object(
      'id', t.id, 'username', t.username, 'first_name', t.first_name, 'last_name', t.last_name
    ),
    jsonb_build_object(
      'id', s.id, 'code', s.code, 'name', s.name, 'image_url', s.image_url,
      'academic_year_id', s.academic_year_id, 'semester_id', s.semester_id, 'scope', s.scope
    ),
    jsonb_build_object('id', c.id, 'name', c.name, 'academic_year_id', c.academic_year_id),
    jsonb_build_object('id', sem.id, 'name', sem.name, 'academic_year_id', sem.academic_year_id),
    count(*) over()
  from public.teacher_assignments ta
  join public.app_users t on t.id = ta.teacher_id
  join public.subjects s on s.id = ta.subject_id
  join public.classrooms c on c.id = ta.classroom_id
  join public.semesters sem on sem.id = ta.semester_id
  where t.school_id = p_school_id
    and c.school_id = p_school_id
    and (p_teacher_id is null or ta.teacher_id = p_teacher_id)
    and (p_classroom_id is null or ta.classroom_id = p_classroom_id)
    and (
      v_pattern is null
      or t.first_name ilike v_pattern escape '\'
      or t.last_name ilike v_pattern escape '\'
      or t.username ilike v_pattern escape '\'
      or s.code ilike v_pattern escape '\'
      or s.name ilike v_pattern escape '\'
      or c.name ilike v_pattern escape '\'
      or sem.name ilike v_pattern escape '\'
    )
  order by ta.created_at desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.search_teacher_assignments(uuid, uuid, uuid, text, int, int)
  from public;
grant execute on function public.search_teacher_assignments(uuid, uuid, uuid, text, int, int)
  to service_role;
