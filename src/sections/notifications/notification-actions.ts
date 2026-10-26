'use client';

import type { NotificationComposeValues } from './notification-compose-schema';

export async function loadNotificationRecipients(): Promise<{ id: string; name: string }[]> {
  const response = await fetch('/api/notifications/send');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'โหลดผู้รับไม่สำเร็จ');
  return data.recipients;
}
export async function sendInternalNotification(input: NotificationComposeValues & { id: string }) {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'ส่งการแจ้งเตือนไม่สำเร็จ');
}
