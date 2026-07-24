-- Paginated, filtered search for the /admin/teacher-assignment "วิชา" list.
-- Search spans columns on joined tables (teacher name/username, subject
-- code/name, classroom name, semester name), which PostgREST's `or` filter
-- can't reliably combine across multiple embedded resources in one query, so
-- do the join + ILIKE OR + LIMIT/OFFSET + total count server-side in SQL.

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
      'academic_year_id', s.academic_year_id, 'semester_id', s.semester_id
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
    and s.school_id = p_school_id
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
