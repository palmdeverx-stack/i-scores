'use client';

import type { Curriculum } from './types';

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message ?? fallback);
  return json;
}

export async function listCurricula() {
  const response = await fetch('/api/curricula');
  return (await parseResponse<{ curricula: Curriculum[] }>(response, 'โหลดหลักสูตรไม่สำเร็จ'))
    .curricula;
}

export async function createCurriculum(input: {
  name: string;
  code?: string;
  version?: string;
  scope: 'school' | 'personal' | 'public';
}) {
  const response = await fetch('/api/curricula', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await parseResponse<{ curriculum: Curriculum }>(response, 'สร้างหลักสูตรไม่สำเร็จ'))
    .curriculum;
}
