import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const APP_ROLES = ['master_admin', 'school_admin', 'teacher', 'student'] as const;
const DEFAULT_EXPERIMENTAL_MENU_PATHS = ['/teacher/lesson-plans'];
const SETTINGS_MIGRATION = '20260813100000_repair_system_ui_settings.sql';

type DatabaseError = {
  code?: string;
  message?: string;
};

function isMissingSettingsStorage(error: DatabaseError | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST205' ||
    error.message?.includes('system_ui_settings') === true
  );
}

function normalizeMenuPaths(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  if (
    value.some((path) => typeof path !== 'string' || !path.startsWith('/') || path.length > 300)
  ) {
    return null;
  }
  return Array.from(new Set(value));
}

export async function GET(request: Request) {
  const caller = requireRole(request, [...APP_ROLES]);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('system_ui_settings')
    .select('experimental_menu_paths, updated_at')
    .eq('singleton', true)
    .maybeSingle();
  if (error) {
    if (isMissingSettingsStorage(error)) {
      console.warn(`[system-ui-settings] Missing migration: ${SETTINGS_MIGRATION}`);
      return NextResponse.json({
        experimentalMenuPaths: DEFAULT_EXPERIMENTAL_MENU_PATHS,
        updatedAt: null,
        storageReady: false,
      });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    experimentalMenuPaths: data?.experimental_menu_paths ?? DEFAULT_EXPERIMENTAL_MENU_PATHS,
    updatedAt: data?.updated_at ?? null,
    storageReady: true,
  });
}

export async function PATCH(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const experimentalMenuPaths = normalizeMenuPaths(body?.experimentalMenuPaths);
  if (!experimentalMenuPaths) {
    return NextResponse.json({ message: 'ข้อมูลการตั้งค่าไม่ถูกต้อง' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('system_ui_settings')
    .upsert(
      {
        singleton: true,
        experimental_menu_paths: experimentalMenuPaths,
        updated_by: caller.sub,
      },
      { onConflict: 'singleton' }
    )
    .select('experimental_menu_paths, updated_at')
    .single();
  if (error || !data) {
    if (isMissingSettingsStorage(error)) {
      return NextResponse.json(
        { message: `ฐานข้อมูลยังไม่ได้ติดตั้ง migration ${SETTINGS_MIGRATION}` },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถบันทึกการตั้งค่าได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    experimentalMenuPaths: data.experimental_menu_paths,
    updatedAt: data.updated_at,
  });
}
