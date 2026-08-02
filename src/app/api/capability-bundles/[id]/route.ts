import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { ALL_SCHOOL_FEATURE_KEYS } from 'src/lib/school-subscription-config';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };
const FEATURE_KEYS = new Set<string>(ALL_SCHOOL_FEATURE_KEYS);
const TARGET_SCOPES = ['individual', 'school', 'both'] as const;
const BUNDLE_FIELDS =
  'id, code, name, description, target_scope, version, feature_keys, is_active, sort_order, created_at, updated_at';

function parsePayload(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const code = typeof value.code === 'string' ? value.code.trim().toUpperCase() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const targetScope = value.targetScope;
  const featureKeys = value.featureKeys;
  if (
    !code ||
    code.length > 50 ||
    !/^[A-Z0-9_-]+$/.test(code) ||
    !name ||
    name.length > 100 ||
    description.length > 500 ||
    !TARGET_SCOPES.includes(targetScope as (typeof TARGET_SCOPES)[number]) ||
    !Array.isArray(featureKeys) ||
    featureKeys.length === 0 ||
    featureKeys.some((key) => typeof key !== 'string' || !FEATURE_KEYS.has(key))
  ) {
    return null;
  }
  return {
    code,
    name,
    description: description || null,
    target_scope: targetScope as (typeof TARGET_SCOPES)[number],
    feature_keys: Array.from(new Set(featureKeys)),
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ message: 'ข้อมูลชุดความสามารถไม่ถูกต้อง' }, { status: 400 });
  }

  const [{ data: current }, { data: duplicate }] = await Promise.all([
    supabaseAdmin.from('capability_bundles').select('version').eq('id', id).maybeSingle(),
    supabaseAdmin
      .from('capability_bundles')
      .select('id')
      .ilike('code', payload.code)
      .neq('id', id)
      .maybeSingle(),
  ]);
  if (!current) return NextResponse.json({ message: 'ไม่พบชุดความสามารถ' }, { status: 404 });
  if (duplicate) {
    return NextResponse.json({ message: 'รหัสชุดความสามารถนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const { data: bundle, error } = await supabaseAdmin
    .from('capability_bundles')
    .update({ ...payload, version: current.version + 1 })
    .eq('id', id)
    .select(BUNDLE_FIELDS)
    .single();
  if (error || !bundle) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถแก้ไขชุดความสามารถได้' },
      { status: 500 }
    );
  }
  return NextResponse.json({ bundle });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { data: bundle, error } = await supabaseAdmin
    .from('capability_bundles')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!bundle) return NextResponse.json({ message: 'ไม่พบชุดความสามารถ' }, { status: 404 });
  return NextResponse.json({ success: true });
}
