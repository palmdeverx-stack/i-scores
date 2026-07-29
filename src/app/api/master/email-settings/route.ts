import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { getResendFromEmail, isResendApiKeyConfigured } from 'src/lib/resend';

// ----------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

function normalizeFromEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input || input.length > 320 || /[\r\n]/.test(input)) return null;

  if (EMAIL_PATTERN.test(input)) return input.toLowerCase();
  const namedAddress = input.match(/^([^<>]{1,100})\s*<([^<>]+)>$/);
  if (!namedAddress || !EMAIL_PATTERN.test(namedAddress[2].trim())) return null;

  const name = namedAddress[1].trim();
  const email = namedAddress[2].trim().toLowerCase();
  return `${name} <${email}>`;
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('system_email_settings')
    .select('resend_from_email, updated_at')
    .eq('singleton', true)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    resendFromEmail: data?.resend_from_email ?? '',
    effectiveFromEmail: await getResendFromEmail(),
    resendApiKeyConfigured: isResendApiKeyConfigured(),
    environmentFallbackConfigured: Boolean(process.env.RESEND_FROM_EMAIL),
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PATCH(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const resendFromEmail = normalizeFromEmail(body?.resendFromEmail);
  if (!resendFromEmail) {
    return NextResponse.json(
      { message: 'รูปแบบอีเมลผู้ส่งไม่ถูกต้อง เช่น E-KRU <invite@example.com>' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('system_email_settings')
    .upsert(
      {
        singleton: true,
        resend_from_email: resendFromEmail,
        updated_by: caller.sub,
      },
      { onConflict: 'singleton' }
    )
    .select('resend_from_email, updated_at')
    .single();
  if (error || !data) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถบันทึกการตั้งค่าอีเมลได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    resendFromEmail: data.resend_from_email,
    effectiveFromEmail: data.resend_from_email,
    resendApiKeyConfigured: isResendApiKeyConfigured(),
    environmentFallbackConfigured: Boolean(process.env.RESEND_FROM_EMAIL),
    updatedAt: data.updated_at,
  });
}
