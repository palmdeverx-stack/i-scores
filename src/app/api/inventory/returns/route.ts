import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

import { InventoryReturnSchema } from 'src/sections/inventory/inventory-return-schema';

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId || !(await canViewViaPermission(caller, 'inventory.manage')))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูรายการคืน' }, { status: 403 });
  const source = new URL(request.url).searchParams.get('source');
  if (source) {
    if (!z.uuid().safeParse(source).success)
      return NextResponse.json({ message: 'ใบเบิกไม่ถูกต้อง' }, { status: 400 });
    const [doc, previous] = await Promise.all([
      supabaseAdmin
        .from('inventory_documents')
        .select('id,document_number,recipient,lines')
        .eq('id', source)
        .eq('school_id', caller.schoolId)
        .eq('kind', 'issue')
        .eq('status', 'posted')
        .maybeSingle(),
      supabaseAdmin
        .from('inventory_returns')
        .select('request_lines')
        .eq('school_id', caller.schoolId)
        .eq('source_document_id', source),
    ]);
    if (doc.error || previous.error)
      return NextResponse.json({ message: 'โหลดรายการคงค้างไม่สำเร็จ' }, { status: 500 });
    if (!doc.data)
      return NextResponse.json({ message: 'ไม่พบใบเบิกที่อนุมัติแล้ว' }, { status: 404 });
    const lines = (doc.data.lines as { item_id: string; quantity: number }[]).map((line) => ({
      ...line,
      quantity: Math.max(
        0,
        line.quantity -
          (previous.data ?? []).reduce(
            (sum, row) =>
              sum +
              (row.request_lines as { item_id: string; quantity: number }[])
                .filter((entry) => entry.item_id === line.item_id)
                .reduce((total, entry) => total + entry.quantity, 0),
            0
          )
      ),
    }));
    return NextResponse.json(
      { source: doc.data, lines },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  const [returns, sources, canManage] = await Promise.all([
    supabaseAdmin
      .from('inventory_returns')
      .select('*')
      .eq('school_id', caller.schoolId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('inventory_documents')
      .select('id,document_number,recipient,lines')
      .eq('school_id', caller.schoolId)
      .eq('kind', 'issue')
      .eq('status', 'posted')
      .order('created_at', { ascending: false })
      .limit(100),
    canManageViaPermission(caller, 'inventory.manage'),
  ]);
  if (returns.error || sources.error)
    return NextResponse.json(
      { message: 'โหลดรายการคืนไม่สำเร็จ กรุณาตรวจสอบ migration' },
      { status: 500 }
    );
  return NextResponse.json(
    { returns: returns.data ?? [], sources: sources.data ?? [], canManage },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId || !(await canManageViaPermission(caller, 'inventory.manage')))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์รับคืนพัสดุ' }, { status: 403 });
  const parsed = InventoryReturnSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: 'กรุณาตรวจสอบผู้คืน วันที่ เหตุผล และรายการคืน' },
      { status: 400 }
    );
  const body = parsed.data;
  const { data, error } = await supabaseAdmin.rpc('record_inventory_return', {
    p_id: body.id,
    p_school: caller.schoolId,
    p_actor: caller.sub,
    p_kind: body.kind,
    p_source: body.source_document_id,
    p_date: body.document_date,
    p_returned_by: body.returned_by,
    p_note: body.note,
    p_lines: body.lines,
  });
  if (error)
    return NextResponse.json(
      {
        message: error.message.includes('outstanding')
          ? 'จำนวนคืนเกินยอดเบิกคงค้าง'
          : error.message.includes('custody')
            ? 'ครุภัณฑ์ถูกคืนหรือเปลี่ยนผู้รับผิดชอบแล้ว กรุณาโหลดข้อมูลใหม่'
            : 'บันทึกคืนไม่สำเร็จ กรุณาตรวจสอบใบเบิก สถานะ และรายการคืน',
      },
      { status: error.code === 'P0001' ? 409 : 500 }
    );
  return NextResponse.json({ id: data }, { status: 201 });
}
