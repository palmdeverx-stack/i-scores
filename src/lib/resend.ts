import 'server-only';

import { Resend } from 'resend';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

let client: Resend | undefined;

function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }

    client = new Resend(apiKey);
  }

  return client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResendClient();
  const from = (await getResendFromEmail()) || 'onboarding@resend.dev';

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getResendFromEmail(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('system_email_settings')
    .select('resend_from_email')
    .eq('singleton', true)
    .maybeSingle();

  if (!error && data?.resend_from_email) return data.resend_from_email;
  return process.env.RESEND_FROM_EMAIL?.trim() || null;
}

export function isResendApiKeyConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type ResendUsage = {
  dailyQuota: string | null;
  monthlyQuota: string | null;
  rateLimit: string | null;
  rateLimitRemaining: string | null;
  rateLimitResetSeconds: string | null;
  checkedAt: string;
};

export async function getResendUsage(): Promise<ResendUsage> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('ยังไม่ได้กำหนด RESEND_API_KEY');

  const response = await fetch('https://api.resend.com/emails?limit=1', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'ekru-admin/1.0',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message ??
        (response.status === 401 || response.status === 403
          ? 'API Key ไม่มีสิทธิ์อ่านข้อมูล Resend กรุณาใช้ Full access key'
          : `Resend API ตอบกลับ ${response.status}`)
    );
  }

  return {
    dailyQuota: response.headers.get('x-resend-daily-quota'),
    monthlyQuota: response.headers.get('x-resend-monthly-quota'),
    rateLimit: response.headers.get('ratelimit-limit'),
    rateLimitRemaining: response.headers.get('ratelimit-remaining'),
    rateLimitResetSeconds: response.headers.get('ratelimit-reset'),
    checkedAt: new Date().toISOString(),
  };
}
