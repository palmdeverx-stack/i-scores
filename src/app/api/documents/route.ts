import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission } from 'src/lib/department-permission-access';

import { DocumentContentSchema } from 'src/sections/documents/document-content';
import { getSchoolDocumentTemplate } from 'src/sections/documents/document-catalog';

// ----------------------------------------------------------------------

const DOCUMENT_FIELDS =
  'id, school_id, created_by, template_slug, title, purpose, content, document_number, document_sequence, requested_document_sequence, planned_date, reserved_at, status, submitted_at, completed_at, created_at, updated_at';

async function authorize(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller?.schoolId || !(await canViewViaPermission(caller, 'documents.access'))) {
    return null;
  }

  return caller;
}

export async function GET(request: Request) {
  const caller = await authorize(request);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึงเอกสาร' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('school_user_documents')
    .select(DOCUMENT_FIELDS)
    .eq('school_id', caller.schoolId)
    .eq('created_by', caller.sub)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  const caller = await authorize(request);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์สร้างเอกสาร' }, { status: 403 });
  }

  const body = await request.json();
  const reserve = body.action === 'reserve';
  if (body.action !== undefined && !reserve)
    return NextResponse.json({ message: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  if (
    reserve &&
    (!z.uuid().safeParse(body.id).success ||
      !z.union([z.iso.date(), z.literal('')]).safeParse(body.plannedDate ?? '').success)
  )
    return NextResponse.json({ message: 'ข้อมูลการจองเลขไม่ถูกต้อง' }, { status: 400 });
  const requestedSequence = body.requestedSequence ?? '';
  if (
    reserve &&
    !z
      .string()
      .regex(/^$|^[1-9][0-9]{0,11}$/)
      .safeParse(requestedSequence).success
  )
    return NextResponse.json({ message: 'เลขที่จองไม่ถูกต้อง' }, { status: 400 });
  const templateSlug = typeof body.templateSlug === 'string' ? body.templateSlug.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
  const template = getSchoolDocumentTemplate(templateSlug);

  if (!template && (!reserve || templateSlug)) {
    return NextResponse.json({ message: 'กรุณาเลือกประเภทเอกสาร' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ message: 'กรุณาระบุชื่อเอกสาร' }, { status: 400 });
  }
  if (title.length > 200 || purpose.length > 1000) {
    return NextResponse.json({ message: 'ข้อมูลเอกสารยาวเกินกำหนด' }, { status: 400 });
  }

  const content =
    body.content === undefined || body.content === null
      ? null
      : DocumentContentSchema.safeParse(body.content);
  if (content && !content.success)
    return NextResponse.json(
      { message: 'เนื้อหาเอกสารไม่ถูกต้องหรือยาวเกินกำหนด' },
      { status: 400 }
    );
  const findReservation = async () => {
    const existing = await supabaseAdmin
      .from('school_user_documents')
      .select(DOCUMENT_FIELDS)
      .eq('id', body.id)
      .eq('school_id', caller.schoolId)
      .eq('created_by', caller.sub)
      .maybeSingle();
    if (existing.error)
      return NextResponse.json({ message: 'ตรวจสอบเลขจองไม่สำเร็จ' }, { status: 500 });
    if (!existing.data) return null;
    const row = existing.data;
    return row.template_slug === (template?.slug ?? '') &&
      row.title === title &&
      (row.requested_document_sequence ?? null) ===
        (requestedSequence ? Number(requestedSequence) : null) &&
      (row.purpose ?? '') === purpose &&
      (row.planned_date ?? '') === (body.plannedDate ?? '')
      ? NextResponse.json({ document: row }, { status: 200 })
      : NextResponse.json(
          { message: 'คำขอจองนี้ถูกใช้งานแล้ว กรุณาโหลดข้อมูลใหม่' },
          { status: 409 }
        );
  };
  if (reserve) {
    const existing = await findReservation();
    if (existing) return existing;
  }
  const { data, error } = await supabaseAdmin
    .from('school_user_documents')
    .insert({
      ...(reserve && {
        id: body.id,
        requested_document_sequence: requestedSequence ? Number(requestedSequence) : null,
        planned_date: body.plannedDate || null,
        reserved_at: new Date().toISOString(),
      }),
      school_id: caller.schoolId,
      created_by: caller.sub,
      template_slug: template?.slug ?? '',
      title,
      purpose: purpose || null,
      content: reserve ? null : content ? content.data : null,
      status: reserve ? 'reserved' : 'draft',
    })
    .select(DOCUMENT_FIELDS)
    .single();

  if (reserve && error?.code === '23505') {
    const existing = await findReservation();
    if (existing) return existing;
    return NextResponse.json(
      { message: 'เลขนี้ถูกใช้หรือจองแล้ว หรือไม่มากกว่าเลขปัจจุบัน กรุณาเลือกเลขใหม่' },
      { status: 409 }
    );
  }
  if (error || !data) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถสร้างเอกสารได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({ document: data }, { status: 201 });
}
