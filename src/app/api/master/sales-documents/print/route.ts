import { z } from 'zod';
import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { renderSalesDocumentHtml } from 'src/sections/sales-documents/sales-document-html';
import {
  salesDocumentKind,
  canEditSalesDocument,
  salesDocumentContentSchema,
} from 'src/sections/sales-documents/sales-document-schema';

export async function GET(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const id = z.uuid().safeParse(new URL(request.url).searchParams.get('id'));
  if (!id.success) return NextResponse.json({ message: 'เลขอ้างอิงไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('master_sales_documents')
    .select('kind, status, document_number, issued_at, content')
    .eq('id', id.data)
    .maybeSingle();
  if (error) return NextResponse.json({ message: 'โหลดเอกสารไม่สำเร็จ' }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบเอกสาร' }, { status: 404 });

  const kind = salesDocumentKind.safeParse(data.kind);
  const parsed = salesDocumentContentSchema.safeParse(data.content);
  if (!kind.success || !parsed.success) {
    return NextResponse.json({ message: 'ข้อมูลเอกสารไม่สมบูรณ์' }, { status: 500 });
  }

  const html = renderSalesDocumentHtml({
    kind: kind.data,
    content: parsed.data,
    documentNumber: data.document_number,
    issuedAt: data.issued_at,
    editHref: canEditSalesDocument({ kind: kind.data, status: data.status })
      ? paths.master.salesDocumentEdit(id.data, kind.data)
      : undefined,
    showPrintButton: true,
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
