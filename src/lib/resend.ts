import 'server-only';

import type { OutgoingEmail } from './gmail-email';

import { Resend } from 'resend';

import { supabaseAdmin } from 'src/lib/supabase-admin';

import { sendGmailEmail } from './gmail-email';

// ----------------------------------------------------------------------

let client: Resend | undefined;

export const RESEND_GMAIL_SENDER_ERROR =
  'อีเมลผู้ส่งเป็น Gmail กรุณาเลือกอีเมลบนโดเมนที่ยืนยันกับ Resend ในหน้าตั้งค่าการส่งอีเมล';

export function isGmailSender(from: string) {
  return /@(?:gmail|googlemail)\.com>?$/i.test(from.trim());
}

export function getEmailProvider() {
  return process.env.EMAIL_PROVIDER?.trim() === 'gmail' ? 'gmail' : 'resend';
}

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

export async function sendEmail(params: OutgoingEmail): Promise<void> {
  if (getEmailProvider() === 'gmail') {
    await sendGmailEmail(params);
    return;
  }
  const from = (await getResendFromEmail()) || 'onboarding@resend.dev';
  if (isGmailSender(from)) throw new Error(RESEND_GMAIL_SENDER_ERROR);

  const { error } = await getResendClient().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
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

function getResendUsageKey() {
  return process.env.RESEND_USAGE_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim();
}

export function isResendUsageKeyConfigured(): boolean {
  return Boolean(getResendUsageKey());
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
  const apiKey = getResendUsageKey();
  if (!apiKey) throw new Error('ยังไม่ได้กำหนดคีย์ Resend');

  const response = await fetch('https://api.resend.com/usage', {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'ekru-admin/1.0',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.name === 'restricted_api_key') {
      throw new Error(
        'คีย์นี้อ่านโควตาไม่ได้ หากต้องการดูโควตา ให้ตั้ง RESEND_USAGE_API_KEY ด้วยคีย์ Full access'
      );
    }
    throw new Error(`ตรวจการใช้งาน Resend ไม่สำเร็จ (HTTP ${response.status})`);
  }

  const { emails } = await response.json();
  const formatQuota = (quota?: { used: number; limit: number | null }) => {
    if (typeof quota?.used !== 'number') return null;
    return quota.limit === null ? `${quota.used} / ไม่จำกัด` : `${quota.used} / ${quota.limit}`;
  };
  return {
    dailyQuota: formatQuota(emails?.daily),
    monthlyQuota: formatQuota(emails?.monthly),
    rateLimit: response.headers.get('ratelimit-limit'),
    rateLimitRemaining: response.headers.get('ratelimit-remaining'),
    rateLimitResetSeconds: response.headers.get('ratelimit-reset'),
    checkedAt: new Date().toISOString(),
  };
}
