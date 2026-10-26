import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { isSignInAllowed } from 'src/lib/auth-rate-limit';
import { writeSecurityAudit } from 'src/lib/security-audit';
import { getSessionStatus } from 'src/lib/session-security';
import {
  LineLoginError,
  lineSameOrigin,
  lineFlowSecrets,
  lineRequestOrigin,
  getLineLoginConfig,
  clearLineFlowCookies,
  requireLineLinkSession,
} from 'src/lib/line-login';

export async function GET(request: NextRequest) {
  const caller = requireRole(request, ['teacher']);
  if (!caller || caller.impersonatedBy) return NextResponse.json({}, { status: 401 });
  const status = await getSessionStatus(caller);
  if (status !== 'active') return NextResponse.json({}, { status: status === 'error' ? 503 : 401 });
  const linked = await supabaseAdmin
    .from('teacher_line_login_links')
    .select('display_name,linked_at')
    .eq('app_user_id', caller.sub)
    .maybeSingle();
  if (linked.error) return NextResponse.json({}, { status: 503 });
  let pending: { displayName: string } | null = null;
  let canManage = false;
  try {
    const session = await requireLineLinkSession(request);
    canManage = true;
    const secrets = lineFlowSecrets(request);
    const flow = await supabaseAdmin
      .from('line_login_flows')
      .select('verified_name,verified_subject')
      .eq('state_hash', secrets.stateHash)
      .eq('browser_hash', secrets.browserHash)
      .eq('intent', 'link')
      .eq('app_user_id', caller.sub)
      .eq('school_id', caller.schoolId)
      .eq('session_hash', session.sessionHash)
      .is('confirmed_at', null)
      .not('used_at', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (flow.error) return NextResponse.json({}, { status: 503 });
    if (flow.data?.verified_subject) pending = { displayName: flow.data.verified_name ?? '' };
  } catch (error) {
    if (error instanceof LineLoginError && error.status === 503)
      return NextResponse.json({}, { status: 503 });
  }
  let enabled = false;
  try {
    enabled = !!getLineLoginConfig();
  } catch {
    /* Configuration errors disable linking. */
  }
  return NextResponse.json(
    {
      linked: linked.data,
      pending,
      canManage,
      enabled,
      username: caller.username,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
export async function POST(request: NextRequest) {
  try {
    const config = getLineLoginConfig();
    if (!config || !lineSameOrigin(request, lineRequestOrigin(request)))
      throw new LineLoginError('invalid_state', 403);
    const session = await requireLineLinkSession(request);
    if (!(await isSignInAllowed(request, `line-link:${session.caller.sub}`)))
      throw new LineLoginError('service_unavailable', 429);
    const body = await request.json().catch(() => null);
    if (body?.action === 'unlink') {
      const result = await supabaseAdmin.rpc('unlink_teacher_line_login', {
        p_user: session.caller.sub,
        p_school: session.caller.schoolId,
      });
      if (result.error) throw new LineLoginError('service_unavailable', 503);
    } else {
      const secrets = lineFlowSecrets(request);
      if (body?.action === 'confirm') {
        const result = await supabaseAdmin.rpc('confirm_teacher_line_login', {
          p_state: secrets.stateHash,
          p_browser: secrets.browserHash,
          p_user: session.caller.sub,
          p_school: session.caller.schoolId,
          p_session: session.sessionHash,
        });
        if (result.error)
          throw new LineLoginError(
            result.error.code === '23505' || result.error.code === 'P0001'
              ? 'link_conflict'
              : 'service_unavailable',
            409
          );
      } else if (body?.action === 'cancel') {
        const result = await supabaseAdmin
          .from('line_login_flows')
          .update({ expires_at: new Date().toISOString(), nonce: null, pkce_verifier: null })
          .eq('state_hash', secrets.stateHash)
          .eq('browser_hash', secrets.browserHash)
          .eq('app_user_id', session.caller.sub)
          .is('confirmed_at', null);
        if (result.error) throw new LineLoginError('service_unavailable', 503);
      } else throw new LineLoginError('invalid_state');
    }
    await writeSecurityAudit({
      action: `auth.line.${body.action}`,
      actorUserId: session.caller.sub,
      schoolId: session.caller.schoolId,
      request,
    });
    const response = NextResponse.json({ ok: true });
    clearLineFlowCookies(response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { code: error instanceof LineLoginError ? error.code : 'service_unavailable' },
      { status: error instanceof LineLoginError ? error.status : 503 }
    );
  }
}
