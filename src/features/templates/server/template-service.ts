import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';
import type { TemplateInput, LessonTemplate, TemplateFilters, TemplateContent } from '../types';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canManageViaPermission } from 'src/lib/department-permission-access';

export const TEMPLATE_SELECT = `
  id, owner_id, school_id, name, description, template_type, scope, status,
  content, metadata, tags, curriculum_id, subject_id, unit_id, course_id,
  grade_levels, indicator_ids, learning_outcome_ids,
  source_template_id, version, usage_count, is_ai_generated, ai_provider, ai_model,
  ai_generated_at, ai_action, ai_request_id, created_at, updated_at,
  archived_at,
  owner:app_users!templates_owner_id_fkey(id, first_name, last_name),
  subject:subjects(id, code, name)
`;

function toRow(input: TemplateInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    template_type: input.templateType,
    scope: input.scope,
    status: input.status,
    content: input.content,
    metadata: input.metadata ?? {},
    tags: input.tags ?? [],
    curriculum_id: input.curriculumId,
    subject_id: input.subjectId ?? null,
    unit_id: input.unitId,
    course_id: input.courseId ?? null,
    grade_levels: input.gradeLevels ?? [],
    indicator_ids: input.indicatorIds ?? [],
    learning_outcome_ids: input.learningOutcomeIds,
    is_ai_generated: input.aiGeneration?.isAIGenerated ?? false,
    ai_provider: input.aiGeneration?.aiProvider ?? null,
    ai_model: input.aiGeneration?.aiModel ?? null,
    ai_generated_at: input.aiGeneration?.aiGeneratedAt ?? null,
    ai_action: input.aiGeneration?.aiAction ?? null,
    ai_request_id: input.aiGeneration?.aiRequestId ?? null,
    archived_at: input.status === 'archived' ? new Date().toISOString() : null,
  };
}

export async function canManageSchoolTemplates(caller: AppTokenPayload) {
  return canManageViaPermission(caller, 'teaching.assignments');
}

export async function getTemplateById(id: string) {
  const { data } = await supabaseAdmin
    .from('templates')
    .select(TEMPLATE_SELECT)
    .eq('id', id)
    .maybeSingle();
  return data as unknown as LessonTemplate | null;
}

export async function canReadTemplate(caller: AppTokenPayload, template: LessonTemplate | null) {
  if (!template) return false;
  if (template.owner_id === caller.sub) return true;
  if (template.scope === 'school')
    return !!caller.schoolId && template.school_id === caller.schoolId;
  if (template.scope === 'system') return template.status === 'active';
  if (template.scope === 'marketplace') {
    const { data } = await supabaseAdmin
      .from('marketplace_template_entitlements')
      .select('id')
      .eq('template_id', template.id)
      .eq('owner_id', caller.sub)
      .maybeSingle();
    return template.status === 'active' && !!data;
  }
  return false;
}

export async function canEditTemplate(caller: AppTokenPayload, template: LessonTemplate | null) {
  if (!template || !['personal', 'school'].includes(template.scope)) return false;
  if (template.scope === 'personal') return template.owner_id === caller.sub;
  return (
    !!caller.schoolId && template.school_id === caller.schoolId && canManageSchoolTemplates(caller)
  );
}

export async function getTemplates(caller: AppTokenPayload, filters: TemplateFilters = {}) {
  let query = supabaseAdmin
    .from('templates')
    .select(TEMPLATE_SELECT)
    .order('updated_at', { ascending: false });

  if (filters.search) query = query.ilike('name', `%${filters.search.replaceAll('%', '\\%')}%`);
  if (filters.templateType) query = query.eq('template_type', filters.templateType);
  if (filters.scope) query = query.eq('scope', filters.scope);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.gradeLevel) query = query.contains('grade_levels', [filters.gradeLevel]);
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.ownerId) query = query.eq('owner_id', filters.ownerId);
  if (filters.schoolId) query = query.eq('school_id', filters.schoolId);
  if (filters.tab === 'mine') query = query.eq('owner_id', caller.sub);
  if (filters.tab === 'school') query = query.eq('scope', 'school');
  if (filters.tab === 'system') query = query.eq('scope', 'system');
  if (filters.tab === 'marketplace') query = query.eq('scope', 'marketplace');

  const { data, error } = await query;
  if (error) throw error;

  const visible = await Promise.all(
    ((data ?? []) as unknown as LessonTemplate[]).map(async (template) => ({
      ...template,
      can_edit: await canEditTemplate(caller, template),
      can_read: await canReadTemplate(caller, template),
    }))
  );
  return visible.filter((template) => template.can_read);
}

export async function getTemplatesPage(
  caller: AppTokenPayload,
  filters: TemplateFilters,
  pagination: { limit: number; offset: number }
) {
  const { limit, offset } = pagination;
  const { data: entitlements, error: entitlementError } = await supabaseAdmin
    .from('marketplace_template_entitlements')
    .select('template_id')
    .eq('owner_id', caller.sub);
  if (entitlementError) throw entitlementError;

  const visibilityFilters = [`owner_id.eq.${caller.sub}`, `and(scope.eq.system,status.eq.active)`];
  if (caller.schoolId) {
    visibilityFilters.push(`and(scope.eq.school,school_id.eq.${caller.schoolId})`);
  }
  const marketplaceTemplateIds = (entitlements ?? []).map((item) => item.template_id);
  if (marketplaceTemplateIds.length) {
    visibilityFilters.push(
      `and(scope.eq.marketplace,status.eq.active,id.in.(${marketplaceTemplateIds.join(',')}))`
    );
  }

  let query = supabaseAdmin
    .from('templates')
    .select(TEMPLATE_SELECT)
    .or(visibilityFilters.join(','))
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false });

  if (filters.search) query = query.ilike('name', `%${filters.search.replaceAll('%', '\\%')}%`);
  if (filters.templateType) query = query.eq('template_type', filters.templateType);
  if (filters.scope) query = query.eq('scope', filters.scope);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.gradeLevel) query = query.contains('grade_levels', [filters.gradeLevel]);
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.ownerId) query = query.eq('owner_id', filters.ownerId);
  if (filters.schoolId) query = query.eq('school_id', filters.schoolId);
  if (filters.tab === 'mine') query = query.eq('owner_id', caller.sub);
  if (filters.tab === 'school') query = query.eq('scope', 'school');
  if (filters.tab === 'system') query = query.eq('scope', 'system');
  if (filters.tab === 'marketplace') query = query.eq('scope', 'marketplace');

  // Fetch one extra row so the client knows whether another page exists.
  const { data, error } = await query.range(offset, offset + limit);
  if (error) throw error;

  const rows = ((data ?? []) as unknown as LessonTemplate[]).slice(0, limit);
  const canManageSchool = await canManageSchoolTemplates(caller);
  const templates = rows.map((template) => ({
    ...template,
    can_edit:
      template.scope === 'personal'
        ? template.owner_id === caller.sub
        : template.scope === 'school' && template.school_id === caller.schoolId && canManageSchool,
    can_read: true,
  }));

  return {
    templates,
    hasMore: (data?.length ?? 0) > limit,
    nextOffset: offset + rows.length,
  };
}

export async function findMatchingTemplates(
  caller: AppTokenPayload,
  input: {
    templateType: TemplateFilters['templateType'];
    subjectId?: string;
    gradeLevel?: string;
    indicatorIds?: string[];
    teachingMethod?: string;
    durationMinutes?: number;
  }
) {
  const templates = await getTemplates(caller, {
    templateType: input.templateType,
    subjectId: input.subjectId,
    gradeLevel: input.gradeLevel,
    status: 'active',
  });
  return templates.filter((template) => {
    const indicatorMatch =
      !input.indicatorIds?.length ||
      input.indicatorIds.some((id) => template.indicator_ids.includes(id));
    const methodMatch =
      !input.teachingMethod ||
      template.metadata.teachingMethods?.some(
        (method) => method.toLocaleLowerCase('th') === input.teachingMethod?.toLocaleLowerCase('th')
      );
    const durationMatch =
      !input.durationMinutes ||
      !template.metadata.estimatedMinutes ||
      template.metadata.estimatedMinutes <= input.durationMinutes;
    return indicatorMatch && methodMatch && durationMatch;
  });
}

export async function createTemplate(caller: AppTokenPayload, input: TemplateInput) {
  if (input.scope === 'school' && !(await canManageSchoolTemplates(caller))) {
    throw new Error('คุณไม่มีสิทธิ์สร้าง Template ของโรงเรียน');
  }
  const { data, error } = await supabaseAdmin
    .from('templates')
    .insert({
      ...toRow(input),
      owner_id: caller.sub,
      school_id: input.scope === 'school' ? caller.schoolId : null,
    })
    .select(TEMPLATE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as LessonTemplate;
}

export async function updateTemplate(caller: AppTokenPayload, id: string, input: TemplateInput) {
  const current = await getTemplateById(id);
  if (!(await canEditTemplate(caller, current)))
    throw new Error('คุณไม่มีสิทธิ์แก้ไข Template นี้');
  if (input.scope === 'school' && !(await canManageSchoolTemplates(caller))) {
    throw new Error('คุณไม่มีสิทธิ์เผยแพร่ Template ให้โรงเรียน');
  }
  const { data, error } = await supabaseAdmin
    .from('templates')
    .update({
      ...toRow(input),
      school_id: input.scope === 'school' ? caller.schoolId : null,
      version: (current?.version ?? 0) + 1,
    })
    .eq('id', id)
    .select(TEMPLATE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as LessonTemplate;
}

export async function duplicateTemplate(caller: AppTokenPayload, id: string) {
  const source = await getTemplateById(id);
  if (!(await canReadTemplate(caller, source)) || !source) throw new Error('ไม่พบ Template');
  const { data, error } = await supabaseAdmin
    .from('templates')
    .insert({
      ...toRow({
        name: `${source.name} สำเนา`,
        description: source.description ?? '',
        templateType: source.template_type,
        scope: 'personal',
        status: 'draft',
        content: structuredClone(source.content),
        metadata: structuredClone(source.metadata),
        tags: [...source.tags],
        curriculumId: source.curriculum_id,
        subjectId: source.subject_id,
        unitId: source.unit_id,
        courseId: source.course_id,
        gradeLevels: [...source.grade_levels],
        indicatorIds: [...source.indicator_ids],
        learningOutcomeIds: [...source.learning_outcome_ids],
      }),
      owner_id: caller.sub,
      school_id: null,
      source_template_id: source.id,
      version: 1,
    })
    .select(TEMPLATE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as LessonTemplate;
}

export async function setTemplateArchived(caller: AppTokenPayload, id: string, archived: boolean) {
  const current = await getTemplateById(id);
  if (!(await canEditTemplate(caller, current)))
    throw new Error('คุณไม่มีสิทธิ์แก้ไข Template นี้');
  const { data, error } = await supabaseAdmin
    .from('templates')
    .update({
      status: archived ? 'archived' : 'draft',
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select(TEMPLATE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as LessonTemplate;
}

export async function deleteTemplate(caller: AppTokenPayload, id: string) {
  const current = await getTemplateById(id);
  if (!(await canEditTemplate(caller, current))) throw new Error('คุณไม่มีสิทธิ์ลบ Template นี้');
  const { error } = await supabaseAdmin.from('templates').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementTemplateUsage(id: string) {
  const current = await getTemplateById(id);
  if (!current) return;
  await supabaseAdmin
    .from('templates')
    .update({ usage_count: current.usage_count + 1 })
    .eq('id', id);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function listHtml(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function templateLessonPlanPatch(type: string, content: TemplateContent): Record<string, string> {
  const value = content as Record<string, unknown>;
  if (type === 'learning_objective')
    return { learning_objectives: String(value.description ?? '') };
  if (type === 'essential_content')
    return { essential_content: `<p>${escapeHtml(String(value.content ?? ''))}</p>` };
  if (type === 'learning_content') {
    const topics =
      (value.topics as Array<{ title: string; description?: string }> | undefined) ?? [];
    return {
      essential_content: `<ol>${topics.map((topic) => `<li><strong>${escapeHtml(topic.title)}</strong>${topic.description ? `<p>${escapeHtml(topic.description)}</p>` : ''}</li>`).join('')}</ol>`,
    };
  }
  if (type === 'learning_activity') {
    return {
      learning_activities: `<h3>${escapeHtml(String(value.activityName ?? ''))}</h3>${listHtml([...((value.teacherActions as string[]) ?? []), ...((value.studentActions as string[]) ?? [])])}`,
    };
  }
  if (type === 'assessment') {
    return {
      assessment: `ASSESSMENT_TABLE_V1:${JSON.stringify([{ issue: String(value.evidence ?? ''), method: String(value.method ?? ''), tool: String(value.instrument ?? ''), criteria: String(value.criteria ?? '') }])}`,
    };
  }
  if (type === 'media') return { learning_media: String(value.title ?? '') };
  if (type === 'question') {
    const questions = (value.questions as Array<{ question: string }> | undefined) ?? [];
    return { guiding_questions: listHtml(questions.map((item) => item.question)) };
  }
  return {};
}

export async function applyTemplateToLessonPlan(
  caller: AppTokenPayload,
  templateId: string,
  lessonPlanId: string,
  sectionType?: string
) {
  const template = await getTemplateById(templateId);
  if (!(await canReadTemplate(caller, template)) || !template)
    throw new Error('ไม่พบ Template หรือไม่มีสิทธิ์ใช้งาน');
  const { data: plan } = await supabaseAdmin
    .from('lesson_plans')
    .select('id, teacher_id, status')
    .eq('id', lessonPlanId)
    .maybeSingle();
  if (!plan || plan.teacher_id !== caller.sub || !['draft', 'revision'].includes(plan.status))
    throw new Error('ไม่พบแผนการสอนที่แก้ไขได้');
  const resolvedSection = sectionType || template.template_type;
  const patch = templateLessonPlanPatch(resolvedSection, structuredClone(template.content));
  if (!Object.keys(patch).length)
    throw new Error('Template ประเภทนี้ยังไม่รองรับ Section ที่เลือก');
  const { error } = await supabaseAdmin.from('lesson_plans').update(patch).eq('id', lessonPlanId);
  if (error) throw error;
  await Promise.all([
    supabaseAdmin.from('lesson_plan_template_usages').insert({
      lesson_plan_id: lessonPlanId,
      section_type: resolvedSection,
      template_id: template.id,
      template_version: template.version,
      content_snapshot: structuredClone(template.content),
      applied_by: caller.sub,
    }),
    incrementTemplateUsage(template.id),
  ]);
  return patch;
}
