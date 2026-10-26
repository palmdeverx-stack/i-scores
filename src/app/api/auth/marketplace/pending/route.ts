import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { readSsoPending, loadSsoProfile } from 'src/lib/marketplace-sso';
import { SSO_HEADERS, MarketplaceSsoError } from 'src/lib/marketplace-sso-crypto';

export async function GET(request: NextRequest) {
  try {
    const { data, identity } = await readSsoPending(request);
    const profile = await loadSsoProfile(identity);
    return NextResponse.json(
      {
        kind: data.kind,
        displayName: identity.display_name,
        role: profile?.role,
        canCreate: !identity.app_user_id && !identity.marketplace_user_id,
      },
      { headers: SSO_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { code: error instanceof MarketplaceSsoError ? error.code : 'service_unavailable' },
      { status: error instanceof MarketplaceSsoError ? error.status : 503, headers: SSO_HEADERS }
    );
  }
}
