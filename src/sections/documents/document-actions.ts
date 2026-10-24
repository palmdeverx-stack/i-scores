'use client';

import type { DocumentContent } from './document-content';
import type { DocumentReservationValues } from './document-reservation-schema';

export type UserDocumentStatus = 'reserved' | 'draft' | 'submitted' | 'ready' | 'cancelled';

export type UserDocument = {
  planned_date: string | null;
  reserved_at: string | null;
  content: DocumentContent | null;
  document_number: string | null;
  document_sequence: number | null;
  id: string;
  school_id: string;
  created_by: string;
  template_slug: string;
  title: string;
  purpose: string | null;
  status: UserDocumentStatus;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listMyDocuments(): Promise<UserDocument[]> {
  const response = await fetch('/api/documents');
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'ไม่สามารถโหลดเอกสารได้');
  }

  return json.documents;
}

export async function createMyDocument(params: {
  templateSlug: string;
  title: string;
  purpose?: string;
  content?: DocumentContent;
}): Promise<UserDocument> {
  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'ไม่สามารถสร้างเอกสารได้');
  }

  return json.document;
}

export async function updateMyDocumentStatus(
  id: string,
  action: 'submit' | 'cancel'
): Promise<UserDocument> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'ไม่สามารถอัปเดตสถานะเอกสารได้');
  }

  return json.document;
}

export async function updateMyDocument(
  id: string,
  params: { templateSlug: string; title: string; purpose?: string; content?: DocumentContent }
): Promise<UserDocument> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', ...params }),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'ไม่สามารถแก้ไขเอกสารได้');
  }

  return json.document;
}

export async function deleteMyDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'ไม่สามารถลบเอกสารได้');
  }
}

export async function getMyDocument(id: string): Promise<UserDocument> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'โหลดเอกสารไม่สำเร็จ');
  return data.document;
}

export async function reserveDocumentNumber(
  input: DocumentReservationValues & { id: string }
): Promise<UserDocument> {
  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, action: 'reserve' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'จองเลขเอกสารไม่สำเร็จ');
  return data.document;
}
