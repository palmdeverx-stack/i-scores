'use client';

// ----------------------------------------------------------------------

export type EmailSettings = {
  resendFromEmail: string;
  effectiveFromEmail: string | null;
  resendApiKeyConfigured: boolean;
  environmentFallbackConfigured: boolean;
  updatedAt: string | null;
};

async function parseResponse(response: Response): Promise<EmailSettings> {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message ?? 'ไม่สามารถจัดการการตั้งค่าอีเมลได้');
  }
  return json;
}

export async function getEmailSettings(): Promise<EmailSettings> {
  return parseResponse(await fetch('/api/master/email-settings'));
}

export async function updateEmailSettings(resendFromEmail: string): Promise<EmailSettings> {
  return parseResponse(
    await fetch('/api/master/email-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resendFromEmail }),
    })
  );
}
