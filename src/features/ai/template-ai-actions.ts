'use client';

import type { TemplateAIResult } from './types/ai.types';
import type { GenerateTemplateRequest } from './schemas/generate-template-request.schema';

export async function requestTemplateAIGeneration(input: GenerateTemplateRequest) {
  const response = await fetch('/api/ai/templates/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message ?? 'สร้าง Template ด้วย AI ไม่สำเร็จ');
  return (json as { result: TemplateAIResult }).result;
}
