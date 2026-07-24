'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type LineNotificationSettings = {
  integration: {
    channelId: string;
    oaBasicId: string;
    isEnabled: boolean;
    hasChannelSecret: boolean;
    hasAccessToken: boolean;
    notifyAbsent: boolean;
    notifyLeave: boolean;
    notifyLate: boolean;
    notifyClassAbsent: boolean;
    updatedAt: string | null;
  };
  usage: {
    sent: number;
    limit: number;
    linkedGuardians: number;
  };
  webhookUrl: string;
  recentDeliveries: Array<{
    id: string;
    event_type: 'absent' | 'leave' | 'late' | 'class_absent';
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';
    last_error: string | null;
    sent_at: string | null;
    created_at: string;
    guardian: { full_name: string } | Array<{ full_name: string }> | null;
    student:
      | {
          name_prefix: string | null;
          first_name: string | null;
          last_name: string | null;
          username: string;
        }
      | Array<{
          name_prefix: string | null;
          first_name: string | null;
          last_name: string | null;
          username: string;
        }>
      | null;
  }>;
};

export type LineNotificationSettingsInput = {
  channelId: string;
  oaBasicId: string;
  webhookUrl: string;
  channelSecret: string;
  accessToken: string;
  isEnabled: boolean;
  notifyAbsent: boolean;
  notifyLeave: boolean;
  notifyLate: boolean;
  notifyClassAbsent: boolean;
};

const headers = (json = false) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${getStoredToken()}`,
});

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? fallback);
  return data;
}

export async function getLineNotificationSettings() {
  const response = await fetch('/api/admin/line-notifications', { headers: headers() });
  return parse<LineNotificationSettings>(response, 'ไม่สามารถโหลดการตั้งค่า LINE ได้');
}

export async function saveLineNotificationSettings(input: LineNotificationSettingsInput) {
  const response = await fetch('/api/admin/line-notifications', {
    method: 'PATCH',
    headers: headers(true),
    body: JSON.stringify(input),
  });
  return parse<{ success: boolean }>(response, 'ไม่สามารถบันทึกการตั้งค่า LINE ได้');
}

export async function testLineConnection() {
  const response = await fetch('/api/admin/line-notifications', {
    method: 'POST',
    headers: headers(),
  });
  return parse<{ bot: { displayName?: string; basicId?: string } }>(
    response,
    'ไม่สามารถทดสอบ LINE ได้'
  );
}
