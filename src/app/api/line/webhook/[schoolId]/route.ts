import { NextResponse } from 'next/server';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { decryptLineCredential } from 'src/lib/line-credentials';
import { signGuardianPortalIdentityToken } from 'src/lib/guardian-portal-token';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ schoolId: string }> };

function validSignature(body: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

async function reply(accessToken: string, replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}

function guardianPortalUrl(request: Request, schoolId: string, lineUserId: string) {
  const token = signGuardianPortalIdentityToken(schoolId, lineUserId);
  const url = new URL('/api/guardian/portal/session/', request.url);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function POST(request: Request, { params }: RouteParams) {
  const { schoolId } = await params;
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';
  const { data: integration } = await supabaseAdmin
    .from('school_line_integrations')
    .select('is_enabled, channel_secret_encrypted, channel_access_token_encrypted')
    .eq('school_id', schoolId)
    .maybeSingle();

  if (!integration?.channel_secret_encrypted) {
    return NextResponse.json({ message: 'LINE integration is unavailable' }, { status: 404 });
  }

  let channelSecret: string;
  try {
    channelSecret = decryptLineCredential(integration.channel_secret_encrypted);
  } catch {
    return NextResponse.json({ message: 'Invalid LINE credentials' }, { status: 500 });
  }
  if (!signature || !validSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  let payload: {
    events?: Array<{
      type: string;
      replyToken?: string;
      source?: { type?: string; userId?: string };
      message?: { type?: string; text?: string };
    }>;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  // LINE verifies a webhook with a signed request containing no events.
  // It must receive 200 even before the school enables real notifications.
  if (!payload.events?.length) {
    return NextResponse.json({ success: true });
  }
  if (!integration.is_enabled || !integration.channel_access_token_encrypted) {
    return NextResponse.json({ success: true, ignored: true });
  }

  let accessToken: string;
  try {
    accessToken = decryptLineCredential(integration.channel_access_token_encrypted);
  } catch {
    return NextResponse.json({ message: 'Invalid LINE access token' }, { status: 500 });
  }

  for (const event of payload.events) {
    if (
      event.type !== 'message' ||
      event.message?.type !== 'text' ||
      !event.message.text ||
      !event.source?.userId ||
      !event.replyToken
    ) {
      continue;
    }
    const messageText = event.message.text.trim();
    if (/^(?:PROFILE|โปรไฟล์|ข้อมูลนักเรียน)$/i.test(messageText)) {
      const { count } = await supabaseAdmin
        .from('student_guardians')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('line_user_id', event.source.userId);
      if (!count) {
        await reply(
          accessToken,
          event.replyToken,
          'บัญชี LINE นี้ยังไม่ได้เชื่อมกับนักเรียน กรุณาสแกน QR จากโรงเรียนก่อน'
        );
        continue;
      }
      await reply(
        accessToken,
        event.replyToken,
        [
          '👨‍👩‍👧 ข้อมูลนักเรียนสำหรับผู้ปกครอง',
          'ลิงก์นี้ใช้เข้าสู่ Parent Portal ได้ตลอด จนกว่าจะยกเลิกการเชื่อม LINE',
          'กรอกรหัสนักเรียน แล้วรับ OTP ทาง LINE เพื่อดูโปรไฟล์และประวัติการเข้าเรียน',
          guardianPortalUrl(request, schoolId, event.source.userId),
        ].join('\n\n')
      );
      continue;
    }

    const match = /^(?:LINK|เชื่อม)\s+([A-Z0-9]{8})$/i.exec(messageText);
    if (!match) continue;

    const tokenHash = createHash('sha256').update(match[1].toUpperCase()).digest('hex');
    const { data: link } = await supabaseAdmin
      .from('guardian_line_link_tokens')
      .select('id, guardian_id, expires_at, used_at')
      .eq('school_id', schoolId)
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (!link || link.used_at || link.expires_at < new Date().toISOString()) {
      await reply(accessToken, event.replyToken, 'รหัสเชื่อมบัญชีไม่ถูกต้องหรือหมดอายุแล้ว');
      continue;
    }

    let displayName: string | null = null;
    const profileResponse = await fetch(
      `https://api.line.me/v2/bot/profile/${event.source.userId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as { displayName?: string };
      displayName = profile.displayName ?? null;
    }

    const { error } = await supabaseAdmin
      .from('student_guardians')
      .update({
        line_user_id: event.source.userId,
        line_display_name: displayName,
        line_linked_at: new Date().toISOString(),
        line_notifications_enabled: true,
      })
      .eq('id', link.guardian_id)
      .eq('school_id', schoolId);
    if (error) {
      await reply(accessToken, event.replyToken, 'เชื่อมบัญชีไม่สำเร็จ กรุณาติดต่อโรงเรียน');
      continue;
    }
    await supabaseAdmin
      .from('guardian_line_link_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', link.id);
    await reply(
      accessToken,
      event.replyToken,
      [
        'เชื่อมบัญชีกับโรงเรียนเรียบร้อยแล้ว',
        'คุณจะได้รับการแจ้งเตือนจากโรงเรียนผ่าน LINE',
        'เปิด Parent Portal เพื่อดูโปรไฟล์และประวัติการเข้าเรียนได้จากลิงก์นี้',
        guardianPortalUrl(request, schoolId, event.source.userId),
        'ลิงก์ไม่หมดอายุ และต้องยืนยัน OTP ก่อนเข้าดูข้อมูล',
      ].join('\n\n')
    );
  }

  return NextResponse.json({ success: true });
}
