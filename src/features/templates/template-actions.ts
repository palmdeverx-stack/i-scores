'use client';

import type {
  TemplateType,
  TemplateScope,
  TemplateInput,
  LessonTemplate,
  TemplateContent,
  TemplateFilters,
  TemplateTabCounts,
} from './types';

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message ?? fallback);
  return json;
}

export async function getTemplates(filters: TemplateFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const response = await fetch(`/api/lesson-plan-templates?${params}`);
  return (await parseResponse<{ templates: LessonTemplate[] }>(response, 'โหลด Template ไม่สำเร็จ'))
    .templates;
}

export async function getTemplatesPage(
  filters: TemplateFilters,
  pagination: { limit: number; offset: number }
) {
  const params = new URLSearchParams({
    limit: String(pagination.limit),
    offset: String(pagination.offset),
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const response = await fetch(`/api/lesson-plan-templates?${params}`);
  return parseResponse<{
    templates: LessonTemplate[];
    hasMore: boolean;
    nextOffset: number;
    tabCounts?: TemplateTabCounts;
  }>(response, 'โหลด Template ไม่สำเร็จ');
}

export async function getTemplateById(id: string) {
  const response = await fetch(`/api/lesson-plan-templates/${id}`);
  return (await parseResponse<{ template: LessonTemplate }>(response, 'โหลด Template ไม่สำเร็จ'))
    .template;
}

export async function getTemplateDocument(id: string) {
  const response = await fetch(`/api/lesson-plan-templates/${id}?include=sections`);
  return parseResponse<{ template: LessonTemplate; sectionTemplates: LessonTemplate[] }>(
    response,
    'โหลดเอกสาร Template ไม่สำเร็จ'
  );
}

export async function getTemplateOptions() {
  const response = await fetch('/api/lesson-plan-templates/options');
  return parseResponse<{
    subjects: Array<{
      id: string;
      curriculum_id: string | null;
      code: string | null;
      name: string;
      learning_area: string | null;
      grade_levels: string[];
      scope: 'system' | 'personal' | 'school' | 'public';
      learning_outcomes_structured: Array<{
        id: string;
        code: string | null;
        description: string;
      }>;
      learning_units_structured: Array<{
        id: string;
        code: string | null;
        name: string;
        estimated_periods: number | null;
      }>;
    }>;
    indicators: Array<{
      id: string;
      subject_id: string;
      code: string;
      description: string;
      learning_standard: string | null;
    }>;
    templates: Array<{
      id: string;
      name: string;
      template_type: TemplateType;
      scope: TemplateScope;
      content: TemplateContent;
    }>;
    learningAreas: Array<{ code: string; name: string }>;
    gradeLevels: Array<{ code: string; name: string }>;
    academicYears: string[];
    semesters: string[];
    canManageSchool: boolean;
    aiEnabled: boolean;
  }>(response, 'โหลดตัวเลือกไม่สำเร็จ');
}

export async function createTemplate(input: TemplateInput) {
  const response = await fetch('/api/lesson-plan-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await parseResponse<{ template: LessonTemplate }>(response, 'สร้าง Template ไม่สำเร็จ'))
    .template;
}

export async function updateTemplate(id: string, input: TemplateInput) {
  const response = await fetch(`/api/lesson-plan-templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await parseResponse<{ template: LessonTemplate }>(response, 'แก้ไข Template ไม่สำเร็จ'))
    .template;
}

export async function uploadTemplateLogo(id: string, file: File) {
  const formData = new FormData();
  formData.set('file', file);
  const response = await fetch(`/api/lesson-plan-templates/${id}/logo`, {
    method: 'POST',
    body: formData,
  });
  return parseResponse<{ logoUrl: string }>(response, 'อัปโหลดโลโก้ไม่สำเร็จ');
}

export async function deleteTemplateLogo(id: string) {
  const response = await fetch(`/api/lesson-plan-templates/${id}/logo`, { method: 'DELETE' });
  return parseResponse<{ success: true }>(response, 'ลบโลโก้ไม่สำเร็จ');
}

export async function deleteTemplate(id: string) {
  const response = await fetch(`/api/lesson-plan-templates/${id}`, { method: 'DELETE' });
  await parseResponse(response, 'ลบ Template ไม่สำเร็จ');
}

export async function templateAction(id: string, action: 'duplicate' | 'archive' | 'restore') {
  const response = await fetch(`/api/lesson-plan-templates/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return parseResponse<{ template: LessonTemplate }>(response, 'ดำเนินการไม่สำเร็จ');
}

export async function applyTemplate(input: {
  templateId: string;
  targetType: 'lesson_plan';
  targetId: string;
  sectionType?: string;
}) {
  const response = await fetch('/api/lesson-plan-templates/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResponse<{ success: true; patch: Record<string, string> }>(
    response,
    'นำ Template ไปใช้ไม่สำเร็จ'
  );
}
