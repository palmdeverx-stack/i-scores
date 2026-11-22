import { z } from 'zod';
import { NextResponse } from 'next/server';

import { sendEmail } from 'src/lib/resend';
import { escapeHtml } from 'src/lib/escape-html';
import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { renderBrandedEmail } from 'src/lib/branded-email-template';
import { renderSalesQuotationPdf } from 'src/lib/sales-quotation-pdf';

import {
  salesMoney,
  salesDocumentTotals,
  salesDocumentContentSchema,
} from 'src/sections/sales-documents/sales-document-schema';
import {
  salesQuotationEmailSchema,
  salesQuotationAttachmentName,
} from 'src/sections/sales-documents/sales-quotation-email-schema';

export const runtime = 'nodejs';

const sendSchema = salesQuotationEmailSchema.extend({
  id: z.uuid(),
  revision: z.iso.datetime({ offset: true }),
});

async function loadIssuedQuotation(id: string, revision: string) {
  const { data, error } = await supabaseAdmin
    .from('master_sales_documents')
    .select('status, document_number, issued_at, updated_at, content')
    .eq('id', id)
    .eq('kind', 'quotation')
    .maybeSingle();
  if (error) return NextResponse.json({ message: 'โหลดใบเสนอราคาไม่สำเร็จ' }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบใบเสนอราคา' }, { status: 404 });
  if (data.status !== 'issued' || !data.document_number) {
    return NextResponse.json({ message: 'กรุณาออกเลขใบเสนอราคาก่อนส่งอีเมล' }, { status: 409 });
  }

  const parsed = salesDocumentContentSchema.safeParse(data.content);
  if (!parsed.success) {
    return NextResponse.json({ message: 'ข้อมูลใบเสนอราคาไม่สมบูรณ์' }, { status: 400 });
  }
  if (revision !== data.updated_at) {
    return NextResponse.json(
      { message: 'ใบเสนอราคามีการแก้ไข กรุณาเปิดหน้าส่งอีเมลอีกครั้ง' },
      { status: 409 }
    );
  }

  return {
    content: parsed.data,
    documentNumber: data.document_number as string,
    issuedAt: data.issued_at,
  };
}

export async function GET(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูใบเสนอราคา' }, { status: 403 });
  }
  const input = sendSchema
    .pick({ id: true, revision: true })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) {
    return NextResponse.json({ message: 'ข้อมูลสำหรับดูเอกสารไม่ถูกต้อง' }, { status: 400 });
  }

  const quotation = await loadIssuedQuotation(input.data.id, input.data.revision);
  if (quotation instanceof Response) return quotation;
  try {
    const pdf = await renderSalesQuotationPdf(quotation);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${salesQuotationAttachmentName(quotation.documentNumber)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error(
      'Could not render sales quotation PDF',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return NextResponse.json({ message: 'สร้างไฟล์ PDF ไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ส่งใบเสนอราคา' }, { status: 403 });
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ message: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 415 });
  }
  const input = sendSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ message: 'ข้อมูลสำหรับส่งอีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  const { id, revision, recipient, subject, message } = input.data;
  const quotation = await loadIssuedQuotation(id, revision);
  if (quotation instanceof Response) return quotation;
  const { documentNumber, content } = quotation;
  const filename = salesQuotationAttachmentName(documentNumber);
  const html = renderBrandedEmail({
    preheader: subject,
    title: subject,
    logoUrl: content.seller.logoUrl ?? 'https://e-kru.com/logo/logo-single.png',
    contentHtml: `
      ${message ? `<p>${escapeHtml(message).replace(/\r\n?|\n/g, '<br>')}</p>` : ''}
      <p>ยอดสุทธิ <strong>${escapeHtml(salesMoney.format(salesDocumentTotals(content).total / 100))}</strong></p>
      <p>เปิดเอกสารฉบับเต็มได้จากไฟล์แนบ ${escapeHtml(filename)}</p>
    `,
  });

  try {
    const attachment = await renderSalesQuotationPdf(quotation);
    await sendEmail({
      to: recipient,
      subject,
      html,
      attachments: [{ filename, content: attachment }],
    });
  } catch (mailError) {
    console.error(
      'Could not send sales quotation email',
      mailError instanceof Error ? mailError.name : 'UnknownError'
    );
    return NextResponse.json(
      { message: 'ส่งอีเมลไม่สำเร็จ กรุณาตรวจการตั้งค่าการส่งอีเมลแล้วลองใหม่' },
      { status: 502 }
    );
  }
  return NextResponse.json({ sent: true });
}
