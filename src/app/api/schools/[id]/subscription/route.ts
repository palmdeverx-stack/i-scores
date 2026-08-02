import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { ALL_SCHOOL_FEATURE_KEYS } from 'src/lib/school-subscription-config';
import { loadEffectiveSchoolEntitlements } from 'src/lib/school-subscription';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };
const STATUSES = ['trialing', 'active', 'past_due', 'suspended', 'canceled'] as const;
const BILLING_CYCLES = ['monthly', 'yearly', 'one_time', 'custom'] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FEATURE_KEYS = new Set<string>(ALL_SCHOOL_FEATURE_KEYS);

async function activeUserCount(schoolId: string, role: string) {
  const { count } = await supabaseAdmin
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('role', role)
    .eq('is_active', true);
  return count ?? 0;
}

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher', 'student']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  if (caller.role !== 'master_admin' && caller.schoolId !== id) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const [{ data: school }, { data: subscription }, entitlements, schoolAdmins, teachers, students] =
    await Promise.all([
      supabaseAdmin
        .from('schools')
        .select('id, name, name_en, code, logo_url, is_active')
        .eq('id', id)
        .maybeSingle(),
      supabaseAdmin
        .from('school_subscriptions')
        .select(
          'id, school_id, plan_name, status, billing_cycle, price, currency, starts_at, ends_at, max_school_admins, max_teachers, max_students, max_line_notifications, enabled_features, notes, updated_at'
        )
        .eq('school_id', id)
        .maybeSingle(),
      loadEffectiveSchoolEntitlements(id, {
        userId: caller.sub,
        role: caller.role,
      }),
      activeUserCount(id, 'school_admin'),
      activeUserCount(id, 'teacher'),
      activeUserCount(id, 'student'),
    ]);

  if (!school) {
    return NextResponse.json({ message: 'ไม่พบโรงเรียนนี้' }, { status: 404 });
  }
  if (caller.role !== 'master_admin') {
    const today = new Date().toISOString().slice(0, 10);
    const previewAllFeatures = caller.previewAllFeatures === true;
    return NextResponse.json({
      school: {
        id: school.id,
        name: school.name,
        name_en: school.name_en,
        code: school.code,
        logo_url: school.logo_url,
        is_active: school.is_active,
      },
      subscription: {
        id: subscription?.id ?? `marketplace:${id}`,
        school_id: subscription?.school_id ?? id,
        plan_name: previewAllFeatures
          ? 'Master Preview — ทุกฟีเจอร์'
          : (subscription?.plan_name ?? 'Marketplace'),
        status: previewAllFeatures
          ? 'active'
          : entitlements.usable
            ? 'active'
            : (subscription?.status ?? 'canceled'),
        starts_at: subscription?.starts_at ?? today,
        ends_at: previewAllFeatures
          ? null
          : (entitlements.accessEndsAt?.slice(0, 10) ?? subscription?.ends_at ?? null),
        enabled_features: previewAllFeatures
          ? ALL_SCHOOL_FEATURE_KEYS
          : entitlements.enabledFeatures,
        updated_at: subscription?.updated_at ?? new Date().toISOString(),
      },
      marketplace: {
        active_license_count: entitlements.activeLicenses.length,
        active_purchase_count: entitlements.activePurchases.length,
      },
    });
  }

  if (!subscription) {
    return NextResponse.json(
      { message: 'ยังไม่มีข้อมูลแพ็กเกจ กรุณาใช้งาน migration ล่าสุด' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    school,
    subscription,
    usage: { schoolAdmins, teachers, students },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const planName = typeof body?.planName === 'string' ? body.planName.trim() : '';
  const status = body?.status;
  const billingCycle = body?.billingCycle;
  const price = Number(body?.price);
  const startsAt = body?.startsAt;
  const requestedEndsAt = body?.endsAt || null;
  const endsAt = billingCycle === 'one_time' ? null : requestedEndsAt;
  const maxSchoolAdmins = Number(body?.maxSchoolAdmins);
  const maxTeachers = Number(body?.maxTeachers);
  const maxStudents = Number(body?.maxStudents);
  const maxLineNotifications = Number(body?.maxLineNotifications);
  const enabledFeatures = body?.enabledFeatures;
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';

  if (
    !planName ||
    !STATUSES.includes(status) ||
    !BILLING_CYCLES.includes(billingCycle) ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof startsAt !== 'string' ||
    !DATE_PATTERN.test(startsAt) ||
    (endsAt && (typeof endsAt !== 'string' || !DATE_PATTERN.test(endsAt))) ||
    (endsAt && endsAt < startsAt) ||
    !Number.isInteger(maxSchoolAdmins) ||
    maxSchoolAdmins < 0 ||
    !Number.isInteger(maxTeachers) ||
    maxTeachers < 0 ||
    !Number.isInteger(maxStudents) ||
    maxStudents < 0 ||
    !Number.isInteger(maxLineNotifications) ||
    maxLineNotifications < 0 ||
    !Array.isArray(enabledFeatures) ||
    enabledFeatures.some((feature) => typeof feature !== 'string' || !FEATURE_KEYS.has(feature))
  ) {
    return NextResponse.json({ message: 'ข้อมูลแพ็กเกจไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: subscription, error } = await supabaseAdmin
    .from('school_subscriptions')
    .upsert(
      {
        school_id: id,
        plan_name: planName,
        status,
        billing_cycle: billingCycle,
        price,
        currency: 'THB',
        starts_at: startsAt,
        ends_at: endsAt,
        max_school_admins: maxSchoolAdmins,
        max_teachers: maxTeachers,
        max_students: maxStudents,
        max_line_notifications: maxLineNotifications,
        enabled_features: Array.from(new Set(enabledFeatures)),
        notes: notes || null,
      },
      { onConflict: 'school_id' }
    )
    .select(
      'id, school_id, plan_name, status, billing_cycle, price, currency, starts_at, ends_at, max_school_admins, max_teachers, max_students, max_line_notifications, enabled_features, notes, updated_at'
    )
    .single();

  if (error || !subscription) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถบันทึกแพ็กเกจได้' },
      { status: 500 }
    );
  }
  return NextResponse.json({ subscription });
}
