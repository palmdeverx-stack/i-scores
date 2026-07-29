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
