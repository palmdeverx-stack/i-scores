import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (
    !caller?.schoolId ||
    (!(await canViewViaPermission(caller, 'inventory.manage')) &&
      !(await canViewViaPermission(caller, 'inventory.approve')))
  )
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูใบจัดซื้อ' }, { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ message: 'รหัสใบจัดซื้อไม่ถูกต้อง' }, { status: 400 });
  const { data: purchase, error } = await supabaseAdmin
    .from('inventory_purchases')
    .select('*')
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .maybeSingle();
  if (error) return NextResponse.json({ message: 'โหลดใบจัดซื้อไม่สำเร็จ' }, { status: 500 });
  if (!purchase) return NextResponse.json({ message: 'ไม่พบใบจัดซื้อ' }, { status: 404 });
  const [items, school, staff, remaining, canManage, canApprove] = await Promise.all([
    supabaseAdmin
      .from('inventory_items')
      .select('id,code,name,unit')
      .eq('school_id', caller.schoolId)
      .in(
        'id',
        purchase.lines.map((line: { item_id: string }) => line.item_id)
      ),
    supabaseAdmin.from('schools').select('name').eq('id', caller.schoolId).maybeSingle(),
    supabaseAdmin
      .from('app_users')
      .select('id,first_name,last_name,username')
      .eq('school_id', caller.schoolId)
      .in('id', [purchase.created_by, purchase.reviewed_by].filter(Boolean)),
    ['ordered', 'partially_received', 'received'].includes(purchase.status)
      ? supabaseAdmin.rpc('inventory_purchase_remaining', { p_school: caller.schoolId, p_id: id })
      : Promise.resolve({ data: purchase.lines, error: null }),
    canManageViaPermission(caller, 'inventory.manage'),
    canManageViaPermission(caller, 'inventory.approve'),
  ]);
  if (items.error || school.error || staff.error || remaining.error)
    return NextResponse.json({ message: 'โหลดข้อมูลประกอบเอกสารไม่สำเร็จ' }, { status: 500 });
  const name = (userId: string) => {
    const user = staff.data?.find((row) => row.id === userId);
    return user
      ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
      : '—';
  };
  return NextResponse.json({
    canEditDraft:
      canManage &&
      purchase.status === 'draft' &&
      (purchase.created_by === caller.sub || caller.role === 'school_admin'),
    purchase,
    items: items.data ?? [],
    remaining: remaining.data ?? [],
    schoolName: school.data?.name ?? '',
    requestedBy: name(purchase.created_by),
    reviewedBy: purchase.reviewed_by ? name(purchase.reviewed_by) : '—',
    canManage,
    canApprove,
  });
}
