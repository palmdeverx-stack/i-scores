-- Shared curriculum components are system templates because they apply across
-- subjects, schools, and personal workspaces. The seed key keeps this migration
-- idempotent without preventing users from creating their own variants.

create or replace function public.seed_core_lesson_plan_master_templates(template_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if template_owner_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.templates template
    where template.metadata ->> 'seedKey' = 'system-master:core-competencies'
  ) then
    insert into public.templates (
      owner_id,
      school_id,
      name,
      description,
      template_type,
      scope,
      status,
      content,
      metadata,
      tags
    )
    values (
      template_owner_id,
      null,
      'สมรรถนะสำคัญของผู้เรียน',
      'สมรรถนะสำคัญกลางสำหรับเลือกใช้และปรับให้เหมาะกับกิจกรรมการเรียนรู้',
      'competency',
      'system',
      'active',
      jsonb_build_object(
        'items',
        jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'title', 'ความสามารถในการสื่อสาร',
            'description', 'รับและส่งสาร ถ่ายทอดความคิด ความรู้ และความรู้สึกอย่างเหมาะสม พร้อมเลือกใช้วิธีสื่อสารที่มีประสิทธิภาพ'
          ),
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'title', 'ความสามารถในการคิด',
            'description', 'คิดวิเคราะห์ สังเคราะห์ คิดอย่างสร้างสรรค์ คิดอย่างมีวิจารณญาณ และคิดเป็นระบบ'
          ),
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'title', 'ความสามารถในการแก้ปัญหา',
            'description', 'แก้ปัญหาและอุปสรรคอย่างมีเหตุผล โดยใช้ข้อมูล หลักฐาน และกระบวนการตัดสินใจที่เหมาะสม'
          ),
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'title', 'ความสามารถในการใช้ทักษะชีวิต',
            'description', 'นำกระบวนการต่าง ๆ ไปใช้ในชีวิตประจำวัน ทำงานร่วมกับผู้อื่น และปรับตัวต่อการเปลี่ยนแปลงอย่างเหมาะสม'
          ),
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'title', 'ความสามารถในการใช้เทคโนโลยี',
            'description', 'เลือกและใช้เทคโนโลยีเพื่อเรียนรู้ สื่อสาร ทำงาน และแก้ปัญหาได้อย่างเหมาะสม มีจริยธรรม และปลอดภัย'
          )
        )
      ),
      jsonb_build_object(
        'seedKey', 'system-master:core-competencies',
        'keywords', jsonb_build_array('สมรรถนะสำคัญ', 'หลักสูตรแกนกลาง'),
        'suitableFor', jsonb_build_array('ทุกกลุ่มสาระการเรียนรู้')
      ),
      array['สมรรถนะสำคัญ', 'หลักสูตรแกนกลาง', 'Master']
    );
  end if;

  if not exists (
    select 1
    from public.templates template
    where template.metadata ->> 'seedKey' = 'system-master:desired-characteristics'
  ) then
    insert into public.templates (
      owner_id,
      school_id,
      name,
      description,
      template_type,
      scope,
      status,
      content,
      metadata,
      tags
    )
    values (
      template_owner_id,
      null,
      'คุณลักษณะอันพึงประสงค์',
      'คุณลักษณะอันพึงประสงค์กลางสำหรับเลือกใช้ในแผนการสอน',
      'desired_characteristic',
      'system',
      'active',
      jsonb_build_object(
        'items',
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'title', characteristic,
              'description', ''
            )
          )
          from unnest(array[
            'รักชาติ ศาสน์ กษัตริย์',
            'ซื่อสัตย์สุจริต',
            'มีวินัย',
            'ใฝ่เรียนรู้',
            'อยู่อย่างพอเพียง',
            'มุ่งมั่นในการทำงาน',
            'รักความเป็นไทย',
            'มีจิตสาธารณะ'
          ]) as characteristic
        )
      ),
      jsonb_build_object(
        'seedKey', 'system-master:desired-characteristics',
        'keywords', jsonb_build_array('คุณลักษณะอันพึงประสงค์', 'หลักสูตรแกนกลาง'),
        'suitableFor', jsonb_build_array('ทุกกลุ่มสาระการเรียนรู้')
      ),
      array['คุณลักษณะอันพึงประสงค์', 'หลักสูตรแกนกลาง', 'Master']
    );
  end if;
end
$$;

revoke all on function public.seed_core_lesson_plan_master_templates(uuid) from public;

-- Backfill an existing installation immediately.
do $$
declare
  existing_owner_id uuid;
begin
  select app_user.id
  into existing_owner_id
  from public.app_users app_user
  where app_user.is_active = true
  order by
    case app_user.role
      when 'master_admin' then 0
      when 'school_admin' then 1
      else 2
    end,
    app_user.created_at
  limit 1;

  perform public.seed_core_lesson_plan_master_templates(existing_owner_id);
end
$$;

-- Fresh installations may not have an application user while migrations run.
-- Seed the catalog as soon as the first active user is created.
create or replace function public.seed_core_lesson_plan_master_templates_after_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    perform public.seed_core_lesson_plan_master_templates(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.seed_core_lesson_plan_master_templates_after_user_insert() from public;

drop trigger if exists seed_core_lesson_plan_master_templates_after_user_insert
  on public.app_users;
create trigger seed_core_lesson_plan_master_templates_after_user_insert
  after insert on public.app_users
  for each row execute function public.seed_core_lesson_plan_master_templates_after_user_insert();
