import { NextResponse } from 'next/server';

import { getLineLoginConfig } from 'src/lib/line-login';

export async function GET() {
  try {
    const config = getLineLoginConfig();
    return NextResponse.json(
      { enabled: !!config, liffId: config?.liffId ?? null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
