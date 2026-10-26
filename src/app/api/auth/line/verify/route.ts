import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { writeSecurityAudit } from 'src/lib/security-audit';
import { verifyLineAccessToken } from 'src/lib/line-access-token';
import { signAppToken, ACCESS_TOKEN_COOKIE, accessTokenCookieOptions } from 'src/lib/auth-token';
import {
  LineLoginError,
  lineSameOrigin,
  lineFlowSecrets,
  lineRequestOrigin,
  verifyLineIdToken,
  getLineLoginConfig,
  eligibleLineTeacher,
  clearLineFlowCookies,
  requireLineLinkSession,
} from 'src/lib/line-login';

export async function POST(request: NextRequest) {
  try {
    const config = getLineLoginConfig();
    if (!config) throw new LineLoginError('not_configured', 503);
    const origin = lineRequestOrigin(request);
    if (!lineSameOrigin(request, origin)) throw new LineLoginError('invalid_state', 403);
    const secrets = lineFlowSecrets(request);
    const body = await request.json().catch(() => null);
    const hasIdToken = typeof body?.idToken === 'string' && body.idToken.length > 0;
    const hasAccessToken = typeof body?.accessToken === 'string' && body.accessToken.length > 0;
    if (
      (body?.idToken !== undefined && body?.accessToken !== undefined) ||
      hasIdToken === hasAccessToken ||
      (hasIdToken ? body.idToken.length : body.accessToken.length) > 16384
    )
      throw new LineLoginError('line_verification_failed', 401);
    const claimed = await supabaseAdmin.rpc('claim_line_login_flow', {
      p_state: secrets.stateHash,
      p_browser: secrets.browserHash,
    });
    if (claimed.error) throw new LineLoginError('service_unavailable', 503);
    const flow = claimed.data?.[0];
    if (
      !flow ||
      flow.channel_id !== config.channelId ||
      flow.redirect_uri !== new URL('/auth/line', origin).href
    )
      throw new LineLoginError('invalid_state');
    const linking = flow.intent === 'link';
    if (linking) {
      const session = await requireLineLinkSession(request);
      if (
        session.caller.sub !== flow.app_user_id ||
        session.caller.schoolId !== flow.school_id ||
        session.sessionHash !== flow.session_hash
      )
        throw new LineLoginError('session_changed', 403);
    }
    const identity = hasIdToken
      ? await verifyLineIdToken(config, body.idToken)
      : await verifyLineAccessToken(config, body.accessToken);
    if (linking) {
      const saved = await supabaseAdmin
        .from('line_login_flows')
        .update({
          verified_subject: identity.subject,
          verified_name: identity.displayName,
          nonce: null,
          pkce_verifier: null,
        })
        .eq('state_hash', secrets.stateHash)
        .eq('browser_hash', secrets.browserHash)
        .is('confirmed_at', null)
        .select('state_hash')
        .maybeSingle();
      if (saved.error || !saved.data) throw new LineLoginError('service_unavailable', 503);
      return NextResponse.json(
        { redirectTo: '/teacher/profile?lineLogin=pending' },
        {
          headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
        }
      );
    }
    const linked = await supabaseAdmin
      .from('teacher_line_login_links')
      .select('id,app_user_id,school_id')
      .eq('line_subject', identity.subject)
      .eq('channel_id', config.channelId)
      .maybeSingle();
    if (linked.error) throw new LineLoginError('service_unavailable', 503);
    if (!linked.data) throw new LineLoginError('not_linked', 403);
    const user = await eligibleLineTeacher(linked.data.app_user_id);
    if (user.school_id !== linked.data.school_id)
      throw new LineLoginError('account_unavailable', 403);
    const updated = await supabaseAdmin
      .from('teacher_line_login_links')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', linked.data.id)
      .select('id')
      .maybeSingle();
    if (updated.error || !updated.data) throw new LineLoginError('not_linked', 403);
    const response = NextResponse.json(
      { redirectTo: '/teacher' },
      {
        headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
      }
    );
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      signAppToken({
        sub: user.id,
        username: user.username,
        role: 'teacher',
        schoolId: user.school_id,
        authProvider: 'line',
        lineLoginId: linked.data.id,
      }),
      accessTokenCookieOptions
    );
    await writeSecurityAudit({
      action: 'auth.line.sign_in',
      actorUserId: user.id,
      schoolId: user.school_id,
      request,
    });
    clearLineFlowCookies(response);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { code: error instanceof LineLoginError ? error.code : 'service_unavailable' },
      {
        status: error instanceof LineLoginError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
    clearLineFlowCookies(response);
    return response;
  }
}
