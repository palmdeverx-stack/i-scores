import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { loadMasterMarketplaceCustomers } from 'src/lib/master-marketplace-customers';

export async function GET(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') ?? 0);
  const search = (params.get('search') ?? '').trim();
  if (!Number.isSafeInteger(page) || page < 0 || page > 100000 || search.length > 200) {
    return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    return NextResponse.json(await loadMasterMarketplaceCustomers(supabaseAdmin, page, search));
  } catch (error) {
    console.error(
      'Unable to load Marketplace customers',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { message: 'ไม่สามารถโหลดข้อมูลลูกค้า Marketplace ได้' },
      { status: 500 }
    );
  }
}
