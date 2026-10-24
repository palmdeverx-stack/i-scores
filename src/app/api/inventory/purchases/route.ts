import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

import {
  PurchaseDraftSchema,
  PurchaseOrderSchema,
  PurchaseReviewSchema,
  PurchaseRequestSchema,
} from 'src/sections/inventory/inventory-purchase-schema';

const schema = z.union([
  PurchaseDraftSchema.and(z.object({ action: z.literal('draft'), id: z.uuid() })),
  PurchaseRequestSchema.and(z.object({ action: z.literal('create'), id: z.uuid() })),
  PurchaseReviewSchema.and(z.object({ action: z.literal('review'), id: z.uuid() })),
  PurchaseOrderSchema.and(z.object({ action: z.literal('order'), id: z.uuid() })),
]);
export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (
    !caller?.schoolId ||
    (!(await canViewViaPermission(caller, 'inventory.manage')) &&
      !(await canViewViaPermission(caller, 'inventory.approve')))
  )
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูการจัดซื้อ' }, { status: 403 });
  const [purchases, canManage, canApprove] = await Promise.all([
    supabaseAdmin
      .from('inventory_purchases')
      .select('*')
      .eq('school_id', caller.schoolId)
      .order('created_at', { ascending: false })
      .limit(100),
    canManageViaPermission(caller, 'inventory.manage'),
    canManageViaPermission(caller, 'inventory.approve'),
  ]);
  if (purchases.error)
    return NextResponse.json(
      { message: 'โหลดรายการจัดซื้อไม่สำเร็จ กรุณาตรวจสอบ migration' },
      { status: 500 }
    );
  return NextResponse.json({ purchases: purchases.data ?? [], canManage, canApprove });
}
export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์จัดการจัดซื้อ' }, { status: 403 });
  const payload = await request.json().catch(() => null);
  const permission = payload?.action === 'review' ? 'inventory.approve' : 'inventory.manage';
  if (!(await canManageViaPermission(caller, permission)))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { message: 'กรุณากรอกข้อมูลและรายการพัสดุให้ครบถ้วน' },
      { status: 400 }
    );
  const body = parsed.data;
  const common = { p_id: body.id, p_school: caller.schoolId, p_actor: caller.sub };
  const { data, error } =
    body.action === 'create' || body.action === 'draft'
      ? await supabaseAdmin.rpc('save_inventory_purchase', {
          ...common,
          p_title: body.title,
          p_purpose: body.purpose,
          p_lines: body.lines,
          p_draft: body.action === 'draft',
        })
      : body.action === 'review'
        ? await supabaseAdmin.rpc('review_inventory_purchase', {
            ...common,
            p_approve: body.approve,
            p_note: body.note,
          })
        : await supabaseAdmin.rpc('order_inventory_purchase', {
            ...common,
            p_supplier: body.supplier,
            p_number: body.order_number,
            p_date: body.order_date,
          });
  if (error) {
    console.error('Inventory purchasing failed', error);
    return NextResponse.json(
      {
        message:
          'บันทึกไม่สำเร็จ กรุณาโหลดข้อมูลใหม่ แบบร่างแก้ไขได้เฉพาะเจ้าของหรือผู้ดูแล และรายการที่ส่งแล้วแก้ไขไม่ได้',
      },
      { status: error.code === 'P0001' ? 409 : 500 }
    );
  }
  return NextResponse.json(
    { id: body.action === 'create' || body.action === 'draft' ? data : body.id },
    { status: body.action === 'create' || body.action === 'draft' ? 201 : 200 }
  );
}
