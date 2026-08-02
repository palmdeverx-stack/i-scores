import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { parsePlanPayload } from '../plan-payload';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const payload = parsePlanPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ message: 'ข้อมูลแพ็กเกจไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: duplicate } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .ilike('code', payload.code)
    .neq('id', id)
    .maybeSingle();
  if (duplicate) {
    return NextResponse.json({ message: 'รหัสแพ็กเกจนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const { data: plan, error } = await supabaseAdmin.rpc(
    'update_subscription_plan_with_entitlements',
    {
      p_plan_id: id,
      p_code: payload.code,
      p_name: payload.name,
      p_description: payload.description,
      p_target_scope: payload.target_scope,
      p_billing_cycle: payload.billing_cycle,
      p_price: payload.price,
      p_currency: payload.currency,
      p_max_school_admins: payload.max_school_admins,
      p_max_teachers: payload.max_teachers,
      p_max_students: payload.max_students,
      p_max_line_notifications: payload.max_line_notifications,
      p_enabled_features: payload.enabled_features,
      p_source_bundles: payload.source_bundles,
      p_is_active: payload.is_active,
      p_sort_order: payload.sort_order,
    }
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  if (!plan) {
    return NextResponse.json({ message: 'ไม่พบแพ็กเกจนี้' }, { status: 404 });
  }
  const updatedPlan = Array.isArray(plan) ? plan[0] : plan;
  return NextResponse.json({ plan: updatedPlan });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: plan, error } = await supabaseAdmin
    .from('subscription_plans')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  if (!plan) {
    return NextResponse.json({ message: 'ไม่พบแพ็กเกจนี้' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
