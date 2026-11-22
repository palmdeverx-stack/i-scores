create function public.update_school_admin_contact(
  p_school_id uuid,
  p_school_updates jsonb,
  p_administrator_id uuid,
  p_admin_username text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  administrator_id uuid;
  school_record public.schools%rowtype;
begin
  select * into strict school_record
  from public.schools where id = p_school_id for update;

  if p_admin_username is not null then
    select id into administrator_id
    from public.app_users
    where id = p_administrator_id and school_id = p_school_id and role = 'school_admin'
    for update;

    if administrator_id is null then
      raise exception 'School administrator not found' using errcode = 'P0002';
    end if;

    update public.app_users set username = p_admin_username where id = administrator_id;
  end if;

  update public.schools
  set name = coalesce(p_school_updates->>'name', name),
      name_en = case when p_school_updates ? 'name_en' then p_school_updates->>'name_en' else name_en end,
      code = coalesce(p_school_updates->>'code', code),
      email = coalesce(p_school_updates->>'email', email)
  where id = p_school_id
  returning * into school_record;

  return jsonb_build_object(
    'id', school_record.id,
    'name', school_record.name,
    'name_en', school_record.name_en,
    'code', school_record.code,
    'document_prefix', school_record.document_prefix,
    'document_sequence_current', school_record.document_sequence_current,
    'logo_url', school_record.logo_url,
    'is_active', school_record.is_active,
    'created_at', school_record.created_at
  );
end;
$$;

revoke all on function public.update_school_admin_contact(uuid, jsonb, uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_school_admin_contact(uuid, jsonb, uuid, text) to service_role;
