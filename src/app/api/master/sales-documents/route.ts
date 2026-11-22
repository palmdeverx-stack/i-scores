import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { sanitizeSalesDocumentText } from 'src/sections/sales-documents/sales-document-rich-text';
import {
  salesDocumentKind,
  salesDocumentTotals,
  salesDocumentIssueSchema,
  salesDocumentContentSchema,
} from 'src/sections/sales-documents/sales-document-schema';

const fields = 'id, kind, status, document_number, content, total_satang, updated_at, issued_at';
const pageSize = 25;
const querySchema = z.object({
  id: z.uuid().optional(),
  kind: salesDocumentKind.optional(),
  status: z.enum(['draft', 'issued']).optional(),
  documentNumber: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]+$/i)
    .optional(),
  page: z.coerce.number().int().min(0).max(10000).default(0),
});
const saveSchema = z.object({
  id: z.uuid().optional(),
  revision: z.iso.datetime({ offset: true }).optional(),
  issue: z.boolean().default(false),
  expectedStatus: z.enum(['draft', 'issued']).default('draft'),
  kind: salesDocumentKind,
  content: salesDocumentContentSchema,
});

export async function GET(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const params = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });

  const { id, kind, status, page, documentNumber } = params.data;
  if (id) {
    const { data, error } = await supabaseAdmin
      .from('master_sales_documents')
      .select(fields)
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ message: 'โหลดเอกสารไม่สำเร็จ' }, { status: 500 });
    if (!data) return NextResponse.json({ message: 'ไม่พบเอกสาร' }, { status: 404 });
    return NextResponse.json(
      { document: data },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  let query = supabaseAdmin
    .from('master_sales_documents')
    .select(
      'id, kind, status, document_number, title:content->>title, customer:content->customer->>name, date:content->>documentDate, total_satang, updated_at',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (kind) query = query.eq('kind', kind);
  if (status) query = query.eq('status', status);
  if (documentNumber) query = query.ilike('document_number', `%${documentNumber}%`);
  const { data, count, error } = await query;
  if (error)
    return NextResponse.json(
      { message: 'โหลดรายการเอกสารไม่สำเร็จ กรุณาตรวจว่าติดตั้ง migration แล้ว' },
      { status: 500 }
    );

  return NextResponse.json(
    { documents: data, total: count ?? 0 },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'ข้อมูลเอกสารไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const { id, revision, issue, kind, content, expectedStatus } = parsed.data;
  if ((id && !revision) || (issue && !id)) {
    return NextResponse.json({ message: 'กรุณาบันทึกแบบร่างก่อนออกเอกสาร' }, { status: 400 });
  }
  if (expectedStatus === 'issued' && (!id || issue || kind !== 'quotation')) {
    return NextResponse.json({ message: 'แก้ไขได้เฉพาะใบเสนอราคาที่ออกแล้ว' }, { status: 400 });
  }

  if (issue || expectedStatus === 'issued') {
    const validation = salesDocumentIssueSchema.safeParse({ kind, content });
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0]?.message ?? 'ข้อมูลสำหรับออกเอกสารไม่ถูกต้อง' },
        { status: 400 }
      );
    }
  }

  const values = {
    kind,
    content:
      content.textFormat === 'html'
        ? {
            ...content,
            details:
              content.details === undefined
                ? undefined
                : sanitizeSalesDocumentText(content.details),
            conditions:
              content.conditions === undefined
                ? undefined
                : sanitizeSalesDocumentText(content.conditions),
            notes: sanitizeSalesDocumentText(content.notes),
          }
        : content,
    total_satang: salesDocumentTotals(content).total,
    updated_by: caller.sub,
  };
  const table = supabaseAdmin.from('master_sales_documents');
  const { data, error } = id
    ? await table
        .update({ ...values, ...(issue && { status: 'issued' }) })
        .eq('id', id)
        .match({
          status: expectedStatus,
          ...(expectedStatus === 'issued' && { kind: 'quotation' }),
        })
        .eq('updated_at', revision!)
        .select(fields)
        .maybeSingle()
    : await table
        .insert({ ...values, created_by: caller.sub })
        .select(fields)
        .single();
  if (error) return NextResponse.json({ message: 'บันทึกเอกสารไม่สำเร็จ' }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { message: 'เอกสารถูกแก้ไขหรือออกแล้ว กรุณาเปิดเอกสารอีกครั้ง' },
      { status: 409 }
    );
  }

  return NextResponse.json({ document: data }, { status: id ? 200 : 201 });
}

export async function DELETE(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ลบเอกสาร' }, { status: 403 });
  }

  const parsed = z
    .object({ id: z.uuid(), revision: z.iso.datetime({ offset: true }) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'ข้อมูลเอกสารไม่ถูกต้อง' }, { status: 400 });
  }

  const { id, revision } = parsed.data;
  const { data, error } = await supabaseAdmin
    .from('master_sales_documents')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
    .eq('updated_at', revision)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ message: 'ลบแบบร่างไม่สำเร็จ' }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { message: 'เอกสารถูกแก้ไข ออกเลข หรือลบแล้ว กรุณาโหลดรายการล่าสุด' },
      { status: 409 }
    );
  }
  return NextResponse.json({ id: data.id });
}
