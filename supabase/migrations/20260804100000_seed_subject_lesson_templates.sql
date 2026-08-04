-- Give every existing and future subject a complete set of active, reusable
-- school templates. Seed keys make the operation idempotent without limiting
-- teachers from creating similarly named custom templates.

create or replace function public.seed_subject_lesson_templates(target_subject_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  subject_record public.subjects%rowtype;
  template_owner_id uuid;
  subject_label text;
  area_label text;
  seed_prefix text;
  common_metadata jsonb;
  component_record record;
begin
  select * into subject_record
  from public.subjects
  where id = target_subject_id;

  if subject_record.id is null then
    return;
  end if;

  select id into template_owner_id
  from public.app_users
  where school_id = subject_record.school_id
    and is_active = true
    and role in ('school_admin', 'teacher')
  order by case when role = 'school_admin' then 0 else 1 end, created_at
  limit 1;

  -- A school must have a staff owner before its shared templates can be seeded.
  if template_owner_id is null then
    return;
  end if;

  subject_label := coalesce(nullif(subject_record.name, ''), 'รายวิชา');
  area_label := coalesce(nullif(subject_record.learning_area, ''), subject_label);
  seed_prefix := 'default-subject:' || subject_record.id::text;
  common_metadata := jsonb_build_object(
    'teachingMethods', jsonb_build_array('Active Learning'),
    'bloomLevels', jsonb_build_array('understand', 'apply', 'analyze'),
    'competencyIds', '[]'::jsonb,
    'characteristicIds', '[]'::jsonb,
    'estimatedMinutes', 50,
    'keywords', jsonb_build_array(subject_label, area_label),
    'suitableFor', jsonb_build_array('ชั้นเรียนทั่วไป')
  );

  for component_record in
    select * from (values
      (
        'learning_objective'::text,
        'จุดประสงค์การเรียนรู้',
        jsonb_build_object(
          'description', 'ผู้เรียนสามารถอธิบายและนำความรู้ในรายวิชา ' || subject_label || ' ไปประยุกต์ใช้ได้อย่างเหมาะสม',
          'domain', 'knowledge',
          'behaviorVerb', 'อธิบายและประยุกต์ใช้',
          'condition', 'หลังจากศึกษาเนื้อหาและร่วมกิจกรรมการเรียนรู้',
          'expectedResult', 'ผู้เรียนเชื่อมโยงความรู้กับสถานการณ์ใกล้ตัวได้',
          'successCriteria', 'ปฏิบัติงานหรือทำแบบประเมินผ่านเกณฑ์ร้อยละ 70'
        )
      ),
      (
        'essential_content',
        'สาระสำคัญ',
        jsonb_build_object(
          'content', subject_label || ' มุ่งให้ผู้เรียนเข้าใจแนวคิดสำคัญ เชื่อมโยงความรู้กับชีวิตจริง และใช้กระบวนการคิดเพื่อแก้ปัญหาอย่างมีเหตุผล',
          'keyConcepts', jsonb_build_array('แนวคิดพื้นฐาน', 'การเชื่อมโยงความรู้', 'การประยุกต์ใช้')
        )
      ),
      (
        'learning_content',
        'สาระการเรียนรู้',
        jsonb_build_object(
          'topics', jsonb_build_array(
            jsonb_build_object('id', gen_random_uuid()::text, 'title', 'ทบทวนความรู้เดิม', 'description', 'สำรวจความรู้และประสบการณ์เดิมที่เกี่ยวข้องกับบทเรียน', 'order', 0),
            jsonb_build_object('id', gen_random_uuid()::text, 'title', 'เรียนรู้แนวคิดสำคัญ', 'description', 'ศึกษาและอภิปรายเนื้อหาหลักของรายวิชา ' || subject_label, 'order', 1),
            jsonb_build_object('id', gen_random_uuid()::text, 'title', 'ประยุกต์ใช้ความรู้', 'description', 'นำความรู้ไปใช้แก้โจทย์หรือสถานการณ์ที่กำหนด', 'order', 2)
          )
        )
      ),
      (
        'learning_activity',
        'กิจกรรมการเรียนรู้แบบ Active Learning',
        jsonb_build_object(
          'activityName', 'เรียนรู้ผ่านการลงมือปฏิบัติ: ' || subject_label,
          'teachingMethod', 'Active Learning',
          'phase', 'learning',
          'durationMinutes', 50,
          'objectives', jsonb_build_array('สร้างความเข้าใจจากการลงมือปฏิบัติ', 'แลกเปลี่ยนความคิดเห็นและสรุปองค์ความรู้'),
          'teacherActions', jsonb_build_array('ตั้งคำถามเชื่อมโยงความรู้เดิม', 'จัดสถานการณ์หรือภาระงาน', 'สังเกตและให้คำแนะนำระหว่างกิจกรรม', 'ชวนผู้เรียนสะท้อนและสรุปบทเรียน'),
          'studentActions', jsonb_build_array('ร่วมตอบคำถามและเสนอความคิดเห็น', 'ลงมือปฏิบัติงานตามภาระงาน', 'แลกเปลี่ยนและตรวจสอบคำตอบกับเพื่อน', 'นำเสนอและสรุปสิ่งที่เรียนรู้'),
          'requiredMaterials', jsonb_build_array('ใบกิจกรรม', 'สื่อประกอบบทเรียน', 'อุปกรณ์ตามบริบทของรายวิชา'),
          'expectedOutputs', jsonb_build_array('ชิ้นงานหรือใบกิจกรรม', 'ข้อสรุปจากการเรียนรู้'),
          'groupType', 'group'
        )
      ),
      (
        'assessment',
        'การวัดและประเมินผล',
        jsonb_build_object(
          'assessmentType', 'performance',
          'method', 'สังเกตกระบวนการทำงาน ตรวจชิ้นงาน และใช้คำถามสะท้อนความเข้าใจ',
          'instrument', 'แบบสังเกตพฤติกรรม แบบประเมินชิ้นงาน และคำถามท้ายกิจกรรม',
          'evidence', 'ชิ้นงาน ใบกิจกรรม การนำเสนอ และการมีส่วนร่วมในชั้นเรียน',
          'criteria', 'ผลงานถูกต้องตามเกณฑ์และแสดงความเข้าใจไม่น้อยกว่าร้อยละ 70',
          'passingScore', 7,
          'maximumScore', 10
        )
      ),
      (
        'rubric',
        'รูบริกประเมินชิ้นงาน',
        jsonb_build_object(
          'rubricType', 'analytic',
          'scoreType', 'score',
          'maximumScore', 12,
          'passingScore', 8,
          'criteria', jsonb_build_array(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'name', 'ความถูกต้องของเนื้อหา',
              'description', 'ประเมินความถูกต้องและความครบถ้วนของสาระสำคัญ',
              'weight', 40,
              'levels', jsonb_build_array(
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 4, 'label', 'ดีเยี่ยม', 'score', 4, 'description', 'ถูกต้องครบถ้วนและอธิบายได้ชัดเจน'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 3, 'label', 'ดี', 'score', 3, 'description', 'ถูกต้องเป็นส่วนใหญ่และขาดรายละเอียดเล็กน้อย'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 2, 'label', 'พอใช้', 'score', 2, 'description', 'มีแนวคิดหลักแต่ยังมีข้อผิดพลาด'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 1, 'label', 'ปรับปรุง', 'score', 1, 'description', 'เนื้อหาไม่ครบและต้องได้รับคำแนะนำ')
              )
            ),
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'name', 'กระบวนการคิดและการแก้ปัญหา',
              'description', 'ประเมินการเลือกใช้วิธีคิดและการอธิบายเหตุผล',
              'weight', 35,
              'levels', jsonb_build_array(
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 4, 'label', 'ดีเยี่ยม', 'score', 4, 'description', 'เลือกวิธีเหมาะสมและอธิบายเหตุผลเป็นลำดับ'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 3, 'label', 'ดี', 'score', 3, 'description', 'ใช้วิธีเหมาะสมและอธิบายได้เกือบครบ'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 2, 'label', 'พอใช้', 'score', 2, 'description', 'แก้ปัญหาได้บางส่วนแต่เหตุผลยังไม่ชัด'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 1, 'label', 'ปรับปรุง', 'score', 1, 'description', 'ยังไม่สามารถเลือกวิธีแก้ปัญหาได้')
              )
            ),
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'name', 'การสื่อสารและการนำเสนอ',
              'description', 'ประเมินความชัดเจนและความเหมาะสมของการนำเสนอ',
              'weight', 25,
              'levels', jsonb_build_array(
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 4, 'label', 'ดีเยี่ยม', 'score', 4, 'description', 'นำเสนอชัดเจน น่าสนใจ และตอบคำถามได้'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 3, 'label', 'ดี', 'score', 3, 'description', 'นำเสนอชัดเจนและตอบคำถามได้เป็นส่วนใหญ่'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 2, 'label', 'พอใช้', 'score', 2, 'description', 'สื่อสารสาระสำคัญได้แต่ยังไม่ต่อเนื่อง'),
                jsonb_build_object('id', gen_random_uuid()::text, 'level', 1, 'label', 'ปรับปรุง', 'score', 1, 'description', 'นำเสนอไม่ชัดเจนและขาดสาระสำคัญ')
              )
            )
          )
        )
      ),
      (
        'media',
        'สื่อและแหล่งเรียนรู้',
        jsonb_build_object(
          'mediaType', 'worksheet',
          'title', 'ชุดสื่อประกอบการเรียนรู้ ' || subject_label,
          'description', 'ใบความรู้ ใบกิจกรรม และสื่อดิจิทัลที่สอดคล้องกับจุดประสงค์ของบทเรียน',
          'url', '',
          'marketplaceProductId', '',
          'usageInstructions', 'เลือกใช้สื่อให้เหมาะกับเนื้อหา ระดับผู้เรียน และทรัพยากรที่มีในชั้นเรียน'
        )
      ),
      (
        'question',
        'คำถามกระตุ้นคิด',
        jsonb_build_object(
          'questions', jsonb_build_array(
            jsonb_build_object('id', gen_random_uuid()::text, 'question', 'จากความรู้เดิม นักเรียนคิดว่าเรื่องนี้เกี่ยวข้องกับชีวิตประจำวันอย่างไร', 'bloomLevel', 'understand', 'expectedAnswer', 'ผู้เรียนเชื่อมโยงแนวคิดกับประสบการณ์หรือสถานการณ์ใกล้ตัวได้', 'followUpQuestions', jsonb_build_array('มีตัวอย่างอื่นอีกหรือไม่', 'เหตุใดจึงคิดเช่นนั้น')),
            jsonb_build_object('id', gen_random_uuid()::text, 'question', 'ถ้าเปลี่ยนเงื่อนไขของสถานการณ์ ผลลัพธ์จะเปลี่ยนอย่างไร', 'bloomLevel', 'analyze', 'expectedAnswer', 'ผู้เรียนวิเคราะห์ความสัมพันธ์ของตัวแปรและให้เหตุผลได้', 'followUpQuestions', jsonb_build_array('ข้อมูลใดสนับสนุนคำตอบของนักเรียน')),
            jsonb_build_object('id', gen_random_uuid()::text, 'question', 'นักเรียนจะนำสิ่งที่เรียนรู้ไปสร้างหรือแก้ปัญหาอะไรได้บ้าง', 'bloomLevel', 'create', 'expectedAnswer', 'ผู้เรียนเสนอแนวทางประยุกต์ใช้ที่เป็นไปได้', 'followUpQuestions', jsonb_build_array('จะตรวจสอบความสำเร็จของแนวทางนั้นอย่างไร'))
          )
        )
      ),
      (
        'reflection',
        'บันทึกหลังสอน',
        jsonb_build_object(
          'sections', jsonb_build_array(
            jsonb_build_object('id', gen_random_uuid()::text, 'title', 'ผลการจัดการเรียนรู้', 'placeholder', 'สรุปผลตามจุดประสงค์และหลักฐานการเรียนรู้ของผู้เรียน', 'required', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'title', 'ปัญหาและอุปสรรค', 'placeholder', 'ระบุปัญหาที่เกิดขึ้น สาเหตุ และผู้เรียนที่ต้องได้รับการช่วยเหลือเพิ่มเติม', 'required', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'title', 'แนวทางพัฒนา', 'placeholder', 'ระบุสิ่งที่จะปรับในการสอนครั้งต่อไปและกิจกรรมเสริม/ซ่อมเสริม', 'required', true)
          )
        )
      )
    ) as seeded(template_type, title, content)
  loop
    if not exists (
      select 1 from public.templates existing
      where existing.subject_id = subject_record.id
        and existing.scope = 'school'
        and existing.template_type = component_record.template_type
        and existing.metadata ->> 'seedKey' = seed_prefix || ':' || component_record.template_type
    ) then
      insert into public.templates (
        owner_id, school_id, name, description, template_type, scope, status,
        content, metadata, tags, subject_id, grade_levels
      ) values (
        template_owner_id,
        subject_record.school_id,
        component_record.title || ' · ' || subject_label,
        'Starter Template มาตรฐานสำหรับรายวิชา ' || subject_label || ' สามารถคัดลอกและปรับใช้ตามบริบทของชั้นเรียน',
        component_record.template_type,
        'school',
        'active',
        component_record.content,
        common_metadata || jsonb_build_object('seedKey', seed_prefix || ':' || component_record.template_type),
        array[subject_label, area_label, component_record.title],
        subject_record.id,
        '{}'::text[]
      );
    end if;
  end loop;

  -- The whole-plan template references the nine seeded component templates.
  if not exists (
    select 1 from public.templates existing
    where existing.subject_id = subject_record.id
      and existing.scope = 'school'
      and existing.template_type = 'lesson_plan'
      and existing.metadata ->> 'seedKey' = seed_prefix || ':lesson_plan'
  ) then
    insert into public.templates (
      owner_id, school_id, name, description, template_type, scope, status,
      content, metadata, tags, subject_id, grade_levels
    )
    select
      template_owner_id,
      subject_record.school_id,
      'แผนการสอนทั้งฉบับ · ' || subject_label,
      'โครงสร้างแผนการสอนมาตรฐานที่ประกอบจาก Template แบบแยกส่วนของรายวิชา ' || subject_label,
      'lesson_plan',
      'school',
      'active',
      jsonb_build_object(
        'sections', jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'sectionType', component.template_type,
            'templateId', component.id,
            'title', component.section_title,
            'order', component.section_order,
            'required', component.template_type not in ('media', 'reflection')
          ) order by component.section_order
        )
      ),
      common_metadata || jsonb_build_object('seedKey', seed_prefix || ':lesson_plan'),
      array[subject_label, area_label, 'แผนการสอนทั้งฉบับ'],
      subject_record.id,
      '{}'::text[]
    from (
      select
        template.id,
        template.template_type,
        case template.template_type
          when 'learning_objective' then 'จุดประสงค์การเรียนรู้'
          when 'essential_content' then 'สาระสำคัญ'
          when 'learning_content' then 'สาระการเรียนรู้'
          when 'learning_activity' then 'กิจกรรมการเรียนรู้'
          when 'assessment' then 'การวัดและประเมินผล'
          when 'rubric' then 'รูบริก'
          when 'media' then 'สื่อและแหล่งเรียนรู้'
          when 'question' then 'คำถามกระตุ้นคิด'
          when 'reflection' then 'บันทึกหลังสอน'
        end as section_title,
        case template.template_type
          when 'learning_objective' then 1
          when 'essential_content' then 2
          when 'learning_content' then 3
          when 'question' then 4
          when 'learning_activity' then 5
          when 'media' then 6
          when 'assessment' then 7
          when 'rubric' then 8
          when 'reflection' then 9
        end as section_order
      from public.templates template
      where template.subject_id = subject_record.id
        and template.scope = 'school'
        and template.template_type <> 'lesson_plan'
        and template.metadata ->> 'seedKey' like seed_prefix || ':%'
    ) component;
  end if;
end;
$$;

revoke all on function public.seed_subject_lesson_templates(uuid) from public;

-- Backfill all subjects that already exist.
select public.seed_subject_lesson_templates(id)
from public.subjects;

create or replace function public.seed_subject_lesson_templates_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_subject_lesson_templates(new.id);
  return new;
end;
$$;

revoke all on function public.seed_subject_lesson_templates_after_insert() from public;

drop trigger if exists seed_subject_lesson_templates_after_insert on public.subjects;
create trigger seed_subject_lesson_templates_after_insert
  after insert on public.subjects
  for each row execute function public.seed_subject_lesson_templates_after_insert();

