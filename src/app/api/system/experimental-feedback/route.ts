import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const APP_ROLES = ['master_admin', 'school_admin', 'teacher', 'student'] as const;
const CATEGORIES = ['positive', 'problem', 'add', 'remove'] as const;
const DEFAULT_EXPERIMENTAL_MENU_PATHS = ['/teacher/lesson-plans'];

export async function POST(request: Request) {
  const caller = requireRole(request, [...APP_ROLES]);
  if (!caller) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const menuPath = typeof body?.menuPath === 'string' ? body.menuPath.trim() : '';
  const pagePath = typeof body?.pagePath === 'string' ? body.pagePath.trim() : '';
  const category = body?.category;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (
    !menuPath.startsWith('/') ||
    menuPath.length > 300 ||
    !pagePath.startsWith('/') ||
    pagePath.length > 500 ||
    !CATEGORIES.includes(category) ||
    message.length < 3 ||
    message.length > 2000
  ) {
    return NextResponse.json({ message: 'ข้อมูลฟีดแบ็กไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('system_ui_settings')
    .select('experimental_menu_paths')
    .eq('singleton', true)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json({ message: settingsError.message }, { status: 500 });
  }

  const experimentalMenuPaths = Array.isArray(settings?.experimental_menu_paths)
    ? settings.experimental_menu_paths.filter((path): path is string => typeof path === 'string')
    : DEFAULT_EXPERIMENTAL_MENU_PATHS;
  const menuPathname = menuPath.split('?')[0];

  if (
    !experimentalMenuPaths.includes(menuPath) ||
    (pagePath !== menuPathname && !pagePath.startsWith(`${menuPathname}/`))
  ) {
    return NextResponse.json(
      { message: 'หน้านี้ไม่ได้เปิดใช้งานเป็นเวอร์ชันทดลอง' },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from('experimental_feature_feedback').insert({
    menu_path: menuPath,
    page_path: pagePath,
    category,
    message,
    user_id: caller.sub,
    school_id: caller.schoolId,
    user_role: caller.role,
  });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
