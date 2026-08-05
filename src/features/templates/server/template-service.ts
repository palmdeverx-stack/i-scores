import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';
import type {
  TemplateInput,
  LessonTemplate,
  TemplateFilters,
  TemplateContent,
  TemplateTabCounts,
  AssessmentContent,
  TemplateCatalogTab,
  LearningObjectiveContent,
  LessonPlanTemplateContent,
} from '../types';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canManageViaPermission } from 'src/lib/department-permission-access';

import { mapObjectivesToAssessmentRows } from '../assessment-mapping';

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

export async function getLinkedSectionTemplates(caller: AppTokenPayload, content: TemplateContent) {
  const sections = (content as LessonPlanTemplateContent).sections ?? [];
  const templateIds = [
    ...new Set(sections.map((section) => section.templateId).filter(Boolean)),
  ] as string[];
  if (!templateIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('templates')
    .select(TEMPLATE_SELECT)
    .in('id', templateIds);
  if (error) throw error;

  const readableTemplates = await Promise.all(
    ((data ?? []) as unknown as LessonTemplate[]).map(async (template) => ({
      template,
      canRead: await canReadTemplate(caller, template),
    }))
  );
  return readableTemplates.filter((item) => item.canRead).map((item) => item.template);
}

export async function getTemplates(caller: AppTokenPayload, filters: TemplateFilters = {}) {
  let query = supabaseAdmin
    .from('templates')
    .select(TEMPLATE_SELECT)
    .order('updated_at', { ascending: false });

  if (filters.search) query = query.ilike('name', `%${filters.search.replaceAll('%', '\\%')}%`);
  if (filters.templateType) query = query.eq('template_type', filters.templateType);
  if (filters.excludeTemplateType) query = query.neq('template_type', filters.excludeTemplateType);
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
  if (filters.excludeTemplateType) query = query.neq('template_type', filters.excludeTemplateType);
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

  let tabCounts: TemplateTabCounts | undefined;
  if (offset === 0) {
    const countTab = async (tab: TemplateCatalogTab) => {
      let countQuery = supabaseAdmin
        .from('templates')
        .select('id', { count: 'exact', head: true })
        .or(visibilityFilters.join(','));

      if (filters.search)
        countQuery = countQuery.ilike('name', `%${filters.search.replaceAll('%', '\\%')}%`);
      if (filters.templateType) countQuery = countQuery.eq('template_type', filters.templateType);
      if (filters.excludeTemplateType)
        countQuery = countQuery.neq('template_type', filters.excludeTemplateType);
      if (filters.scope) countQuery = countQuery.eq('scope', filters.scope);
      if (filters.status) countQuery = countQuery.eq('status', filters.status);
      if (filters.gradeLevel)
        countQuery = countQuery.contains('grade_levels', [filters.gradeLevel]);
      if (filters.subjectId) countQuery = countQuery.eq('subject_id', filters.subjectId);
      if (filters.tag) countQuery = countQuery.contains('tags', [filters.tag]);
      if (filters.ownerId) countQuery = countQuery.eq('owner_id', filters.ownerId);
      if (filters.schoolId) countQuery = countQuery.eq('school_id', filters.schoolId);
      if (tab === 'mine') countQuery = countQuery.eq('owner_id', caller.sub);
      if (tab === 'school') countQuery = countQuery.eq('scope', 'school');
      if (tab === 'system') countQuery = countQuery.eq('scope', 'system');
      if (tab === 'marketplace') countQuery = countQuery.eq('scope', 'marketplace');

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      return count ?? 0;
    };
    const tabs: TemplateCatalogTab[] = ['all', 'mine', 'school', 'system', 'marketplace'];
    const counts = await Promise.all(tabs.map(countTab));
    tabCounts = Object.fromEntries(
      tabs.map((tab, index) => [tab, counts[index]])
    ) as TemplateTabCounts;
  }

  return {
    templates,
    hasMore: (data?.length ?? 0) > limit,
    nextOffset: offset + rows.length,
    tabCounts,
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

function structuredItemsHtml(value: Record<string, unknown>) {
  const source = (value.items ?? value.standards ?? value.competencies ?? []) as unknown;
  const items = Array.isArray(source) ? source : [];
  return `<ul>${items
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number')
        return `<li>${escapeHtml(String(item))}</li>`;
      const row = (item ?? {}) as Record<string, unknown>;
      const code = String(row.code ?? '');
      const title = String(row.title ?? row.name ?? '');
      const description = String(row.description ?? row.detail ?? '');
      const heading = [code, title || (!code ? description : '')].filter(Boolean).join(' — ');
      const detail = title || code ? description : '';
      return heading
        ? `<li><strong>${escapeHtml(heading)}</strong>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}</li>`
        : '';
    })
    .join('')}</ul>`;
}

function hasMeaningfulStructuredItems(source: unknown) {
  return (
    Array.isArray(source) &&
    source.some((item) => {
      if (typeof item === 'string' || typeof item === 'number')
        return Boolean(String(item).trim());
      const row = (item ?? {}) as Record<string, unknown>;
      return [row.code, row.title, row.name, row.description].some(
        (field) => typeof field === 'string' && field.trim()
      );
    })
  );
}

function hasMeaningfulSectionContent(type: string, content: TemplateContent) {
  const value = content as Record<string, unknown>;
  if (type === 'learning_standard') {
    return (
      hasMeaningfulStructuredItems(value.items) ||
      hasMeaningfulStructuredItems(value.milestoneIndicators) ||
      hasMeaningfulStructuredItems(value.terminalIndicators)
    );
  }
  if (
    ['competency', 'desired_characteristic', 'learner_development', 'learning_task'].includes(
      type
    )
  ) {
    const source = (value.items ?? value.standards ?? value.competencies ?? []) as unknown;
    return hasMeaningfulStructuredItems(source);
  }
  if (type === 'learning_objective') {
    const items = (value.objectives as Array<Record<string, unknown>> | undefined) ?? [value];
    return items.some((item) =>
      [item.description, item.behaviorVerb, item.condition, item.expectedResult].some(
        (field) => typeof field === 'string' && field.trim()
      )
    );
  }
  if (type === 'essential_content')
    return (
      Boolean(String(value.content ?? '').trim()) ||
      Boolean((value.keyConcepts as unknown[])?.length)
    );
  if (type === 'learning_content') return Boolean((value.topics as unknown[])?.length);
  if (type === 'learning_activity') {
    const items = (value.items ?? []) as Array<{ title?: string; description?: string }>;
    return items.some(
      (item) => Boolean(item.title?.trim()) || Boolean(item.description?.trim())
    );
  }
  if (type === 'assessment')
    return (
      ((value.rows as unknown[])?.length ?? 0) > 0 ||
      [value.method, value.instrument, value.evidence, value.criteria].some(
        (field) => typeof field === 'string' && field.trim()
      )
    );
  if (type === 'media') {
    const items = (value.items as Array<Record<string, unknown>> | undefined) ?? [value];
    return items.some((item) => typeof item.title === 'string' && item.title.trim());
  }
  if (type === 'question')
    return ((value.questions as Array<Record<string, unknown>> | undefined) ?? []).some(
      (item) => typeof item.question === 'string' && item.question.trim()
    );
  return Object.values(value).some((field) => typeof field === 'string' && field.trim());
}

function templateLessonPlanPatch(type: string, content: TemplateContent): Record<string, string> {
  const value = content as Record<string, unknown>;
  if (type === 'learning_standard')
    return {
      learning_standards: structuredItemsHtml({ items: value.items ?? [] }),
      milestone_indicators: structuredItemsHtml({ items: value.milestoneIndicators ?? [] }),
      terminal_indicators: structuredItemsHtml({ items: value.terminalIndicators ?? [] }),
    };
  if (type === 'learning_objective') {
    const objectives = (value.objectives as
      | Array<{
          description?: string;
          domain?: string;
          behaviorVerb?: string;
          condition?: string;
          expectedResult?: string;
          successCriteria?: string;
        }>
      | undefined) ?? [
      {
        description: String(value.description ?? ''),
        domain: value.domain ? String(value.domain) : undefined,
      },
    ];
    return {
      learning_objectives: `<ol>${objectives
        .map((objective) => {
          const statement =
            [objective.condition, objective.behaviorVerb, objective.expectedResult]
              .filter(Boolean)
              .join(' ') ||
            objective.description ||
            '';
          const criteria = objective.successCriteria
            ? `<br><small>เกณฑ์ความสำเร็จ: ${escapeHtml(objective.successCriteria)}</small>`
            : '';
          return `<li>${escapeHtml(statement)}${objective.domain ? ` <strong>(${escapeHtml(objective.domain)})</strong>` : ''}${criteria}</li>`;
        })
        .join('')}</ol>`,
    };
  }
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
    const items = (value.items ?? []) as Array<{ title?: string; description?: string }>;
    const rows = items
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        description: String(item.description ?? '').trim(),
      }))
      .filter((row) => row.title || row.description);
    return {
      learning_activities: rows.length ? `ACTIVITIES_LIST_V1:${JSON.stringify(rows)}` : '',
    };
  }
  if (type === 'assessment') {
    const rows = (value.rows ?? []) as Array<{
      issue?: string;
      method?: string;
      instrument?: string;
      criteria?: string;
    }>;
    return {
      assessment: `ASSESSMENT_TABLE_V1:${JSON.stringify(
        rows.length
          ? rows.map((row) => ({
              issue: String(row.issue ?? ''),
              method: String(row.method ?? ''),
              tool: String(row.instrument ?? ''),
              criteria: String(row.criteria ?? ''),
            }))
          : [
              {
                issue: String(value.evidence ?? ''),
                method: String(value.method ?? ''),
                tool: String(value.instrument ?? ''),
                criteria: String(value.criteria ?? ''),
              },
            ]
      )}`,
    };
  }
  if (type === 'media') {
    const items = (value.items as Array<{ title?: string }> | undefined) ?? [value];
    return {
      learning_media: items
        .map((item) => String(item.title ?? ''))
        .filter(Boolean)
        .join('\n'),
    };
  }
  if (type === 'question') {
    const questions = (value.questions as Array<{ question: string }> | undefined) ?? [];
    return { guiding_questions: listHtml(questions.map((item) => item.question)) };
  }
  if (type === 'competency') return { learner_competencies: structuredItemsHtml(value) };
  if (type === 'desired_characteristic')
    return { desired_characteristics: structuredItemsHtml(value) };
  if (type === 'learner_development') return { learner_competencies: structuredItemsHtml(value) };
  if (type === 'learning_task') return { learning_activities: structuredItemsHtml(value) };
  return {};
}

async function fullLessonPlanTemplatePatch(
  caller: AppTokenPayload,
  content: TemplateContent
): Promise<Record<string, string>> {
  const sections = (
    (content as Record<string, unknown>).sections as
      | Array<{
          templateId?: string;
          sectionType: string;
          order: number;
          content?: TemplateContent;
        }>
      | undefined
  )?.toSorted((left, right) => left.order - right.order);
  if (!sections?.length) throw new Error('Template แผนฉบับเต็มยังไม่มีองค์ประกอบ');

  const readableTemplates = await getLinkedSectionTemplates(caller, content);
  const templateById = new Map(readableTemplates.map((template) => [template.id, template]));
  const patch: Record<string, string> = {};

  const resolvedSections = sections.map((section) => {
    const sectionTemplate = section.templateId ? templateById.get(section.templateId) : null;
    const sectionContent =
      section.content && hasMeaningfulSectionContent(section.sectionType, section.content)
        ? section.content
        : sectionTemplate?.content;
    return { ...section, sectionContent };
  });
  const objectiveContent = resolvedSections.find(
    (section) => section.sectionType === 'learning_objective'
  )?.sectionContent as LearningObjectiveContent | undefined;

  resolvedSections.forEach((section) => {
    let { sectionContent } = section;
    if (!sectionContent) return;

    if (section.sectionType === 'assessment' && objectiveContent) {
      const assessmentContent = sectionContent as AssessmentContent;
      sectionContent = {
        ...assessmentContent,
        rows: mapObjectivesToAssessmentRows(objectiveContent, assessmentContent),
      };
    }

    const sectionPatch = templateLessonPlanPatch(
      section.sectionType,
      structuredClone(sectionContent)
    );
    Object.entries(sectionPatch).forEach(([field, value]) => {
      patch[field] = patch[field] ? `${patch[field]}\n${value}` : value;
    });
  });

  if (!Object.keys(patch).length) {
    throw new Error('องค์ประกอบใน Template แผนฉบับเต็มยังไม่รองรับการนำไปใช้');
  }
  return patch;
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
  const patch =
    template.template_type === 'lesson_plan'
      ? await fullLessonPlanTemplatePatch(caller, structuredClone(template.content))
      : templateLessonPlanPatch(resolvedSection, structuredClone(template.content));
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
