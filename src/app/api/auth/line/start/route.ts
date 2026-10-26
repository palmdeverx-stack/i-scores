import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { getClientIp, isSignInAllowed } from 'src/lib/auth-rate-limit';
import {
  LINE_STATE_COOKIE,
  LINE_BROWSER_COOKIE,
  lineFlowCookieOptions,
} from 'src/lib/line-login-cookies';
import {
  lineSecret,
  lineDigest,
  LineLoginError,
  lineSameOrigin,
  lineFlowSecrets,
  lineRequestOrigin,
  getLineLoginConfig,
  requireLineLinkSession,
} from 'src/lib/line-login';

export async function POST(request: NextRequest) {
  try {
    const config = getLineLoginConfig();
    if (!config) throw new LineLoginError('not_configured', 503);
    const origin = lineRequestOrigin(request);
    if (!lineSameOrigin(request, origin)) throw new LineLoginError('invalid_state', 403);
    if (!(await isSignInAllowed(request, `line-login:${getClientIp(request)}`)))
      throw new LineLoginError('service_unavailable', 429);
    const body = await request.json().catch(() => null);
    if (!['login', 'link', 'resume'].includes(body?.intent))
      throw new LineLoginError('invalid_state');
    const endpoint = new URL('/auth/line', origin).href;
    // A LIFF redirect must resume the existing intent, never turn an expired link into a login.
    if (
      body.intent === 'resume' &&
      (request.cookies.has(LINE_STATE_COOKIE) || request.cookies.has(LINE_BROWSER_COOKIE))
    ) {
      const secrets = lineFlowSecrets(request);
      const result = await supabaseAdmin
        .from('line_login_flows')
        .select('intent,app_user_id,school_id,session_hash,channel_id,redirect_uri')
        .eq('state_hash', secrets.stateHash)
        .eq('browser_hash', secrets.browserHash)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (result.error) throw new LineLoginError('service_unavailable', 503);
      const flow = result.data;
      if (
        !flow ||
        flow.channel_id !== config.channelId ||
        flow.redirect_uri !== endpoint ||
        (body.expectedIntent === 'link' && flow.intent !== 'link')
      )
        throw new LineLoginError('invalid_state');
      if (flow.intent === 'link') {
        const session = await requireLineLinkSession(request);
        if (
          session.caller.sub !== flow.app_user_id ||
          session.caller.schoolId !== flow.school_id ||
          session.sessionHash !== flow.session_hash
        )
          throw new LineLoginError('session_changed', 403);
      }
      return NextResponse.json({ ready: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.intent === 'resume' && body.expectedIntent === 'link')
      throw new LineLoginError('invalid_state');
    const intent = body.intent === 'resume' ? 'login' : body.intent;
    const session = intent === 'link' ? await requireLineLinkSession(request) : null;
    const state = lineSecret();
    const browser = lineSecret();
    const { error } = await supabaseAdmin.from('line_login_flows').insert({
      state_hash: lineDigest(state),
      browser_hash: lineDigest(browser),
      intent,
      app_user_id: session?.caller.sub ?? null,
      school_id: session?.caller.schoolId ?? null,
      session_hash: session?.sessionHash ?? null,
      channel_id: config.channelId,
      redirect_uri: endpoint,
      nonce: null,
      pkce_verifier: null,
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });
    if (error) throw new LineLoginError('service_unavailable', 503);
    const response = NextResponse.json(
      {
        ready: true,
        authorizationUrl: intent === 'link' ? '/auth/line?intent=link' : '/auth/line',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    response.cookies.set(LINE_STATE_COOKIE, state, lineFlowCookieOptions);
    response.cookies.set(LINE_BROWSER_COOKIE, browser, lineFlowCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json(
      { code: error instanceof LineLoginError ? error.code : 'service_unavailable' },
      { status: error instanceof LineLoginError ? error.status : 503 }
    );
  }
}
