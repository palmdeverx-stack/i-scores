import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

import {
  InventoryAssetRegisterSchema,
  InventoryAssetActivateSchema,
} from 'src/sections/inventory/inventory-asset-schema';

const schema = z.union([
  InventoryAssetRegisterSchema.extend({ action: z.literal('register'), id: z.uuid() }),
  InventoryAssetActivateSchema.extend({ action: z.literal('activate'), id: z.uuid() }),
]);
export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId || !(await canViewViaPermission(caller, 'inventory.manage')))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูทะเบียนครุภัณฑ์' }, { status: 403 });
  const itemId = new URL(request.url).searchParams.get('itemId');
  if (itemId) {
    if (!z.uuid().safeParse(itemId).success)
      return NextResponse.json({ message: 'รหัสครุภัณฑ์ไม่ถูกต้อง' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('inventory_asset_receipts', {
      p_school: caller.schoolId,
      p_item: itemId,
    });
    if (error)
      return NextResponse.json({ message: 'โหลดรายการรับเข้าครุภัณฑ์ไม่สำเร็จ' }, { status: 500 });
    return NextResponse.json({ receipts: data ?? [] });
  }
  const [assets, canManage] = await Promise.all([
    supabaseAdmin
      .from('inventory_assets')
      .select('*')
      .eq('school_id', caller.schoolId)
      .order('registered_at', { ascending: false })
      .limit(100),
    canManageViaPermission(caller, 'inventory.manage'),
  ]);
  if (assets.error)
    return NextResponse.json(
      { message: 'โหลดทะเบียนครุภัณฑ์ไม่สำเร็จ กรุณาตรวจสอบ migration' },
      { status: 500 }
    );
  return NextResponse.json({ assets: assets.data ?? [], canManage });
}
export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId || !(await canManageViaPermission(caller, 'inventory.manage')))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์จัดการครุภัณฑ์' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: 'กรุณาตรวจสอบข้อมูลทะเบียนครุภัณฑ์' }, { status: 400 });
  const body = parsed.data;
  const common = { p_id: body.id, p_school: caller.schoolId, p_actor: caller.sub };
  const { error } =
    body.action === 'register'
      ? await supabaseAdmin.rpc('register_inventory_asset', {
          ...common,
          p_item: body.item_id,
          p_receipt: body.receipt_movement_id,
          p_code: body.asset_code,
          p_serial: body.serial_number,
          p_date: body.acquisition_date,
          p_cost: body.acquisition_cost,
          p_notes: body.notes,
        })
      : await supabaseAdmin.rpc('activate_inventory_asset', {
          ...common,
          p_custodian: body.custodian,
          p_location: body.location,
        });
  if (error) {
    console.error('Equipment registration failed', error);
    return NextResponse.json(
      {
        message:
          error.code === '23505'
            ? 'เลขทะเบียนครุภัณฑ์ซ้ำ'
            : error.message.includes('fully registered') || error.message.includes('balance')
              ? 'ขึ้นทะเบียนครบจำนวนที่รับเข้าแล้ว'
              : 'บันทึกไม่สำเร็จ กรุณาตรวจสอบใบรับเข้า สถานะ และข้อมูลผู้รับผิดชอบ',
      },
      { status: error.code === 'P0001' || error.code === '23505' ? 409 : 500 }
    );
  }
  return NextResponse.json({ id: body.id }, { status: body.action === 'register' ? 201 : 200 });
}
