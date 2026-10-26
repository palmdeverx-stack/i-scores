import 'server-only';

import { randomUUID } from 'node:crypto';

import { supabaseAdmin } from './supabase-admin';
import { canReviewLessonPlans } from './lesson-plan-access';
import { canManageViaPermission } from './department-permission-access';

export type WorkflowNotificationEvent = {
  id: string;
  school_id: string;
  kind: string;
  source_id: string;
  status: string;
  owner_id: string | null;
  actor_id: string | null;
  title: string;
  note: string | null;
};
export function workflowNotificationContent(event: WorkflowNotificationEvent, role: string) {
  const root = role === 'school_admin' ? '/admin' : '/teacher';
  const submitted = event.status === 'submitted';
  const source =
    event.kind === 'lesson_plan'
      ? 'แผนการสอน'
      : event.kind === 'inventory_purchase'
        ? 'ใบขอจัดซื้อ'
        : 'ใบขอเบิกพัสดุ';
  const status: Record<string, string> = {
    submitted: 'ส่งมาให้พิจารณา',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    revision: 'ส่งกลับให้แก้ไข',
    posted: 'อนุมัติเบิกจ่ายแล้ว',
    ordered: 'ออกใบสั่งซื้อแล้ว',
    partially_received: 'รับพัสดุบางส่วนแล้ว',
    received: 'รับพัสดุครบแล้ว',
  };
  const link =
    event.kind === 'lesson_plan'
      ? submitted
        ? `${root}/lesson-plan-reviews`
        : `/teacher/lesson-plans/${event.source_id}/edit`
      : event.kind === 'inventory_purchase'
        ? `${root}/inventory/purchases/${event.source_id}`
        : `${root}/inventory/${submitted ? 'approvals' : 'issue'}`;
  return {
    type: `${event.kind}.${event.status}`,
    title: `${source}${status[event.status] ?? event.status}`,
    body: [event.title, event.note].filter(Boolean).join('\n'),
    link,
  };
}

/** Durable outbox: invoked when a school inbox is read (including Realtime
 * refresh). Leases and unique event keys make concurrent reads/retries safe. */
export async function flushWorkflowNotifications(schoolId: string): Promise<void> {
  const token = randomUUID();
  const claimed = await supabaseAdmin.rpc('claim_notification_events', {
    p_school: schoolId,
    p_token: token,
  });
  if (claimed.error || !claimed.data?.length) return;
  const events = claimed.data as WorkflowNotificationEvent[];
  try {
    const { data: staff, error } = await supabaseAdmin
      .from('app_users')
      .select('id,username,role')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .in('role', ['school_admin', 'teacher']);
    if (error) throw error;
    const recipients = staff ?? [];
    const permissions = new Map<string, Promise<boolean>>();
    const canReceive = (person: (typeof recipients)[number], lesson: boolean) => {
      const key = `${person.id}:${lesson}`;
      if (!permissions.has(key)) {
        const caller = { sub: person.id, username: person.username, role: person.role, schoolId };
        permissions.set(
          key,
          lesson
            ? canReviewLessonPlans(caller, true)
            : canManageViaPermission(caller, 'inventory.approve')
        );
      }
      return permissions.get(key)!;
    };
    for (const event of events) {
      if (event.school_id !== schoolId) throw new Error('Outbox school mismatch');
      const selected =
        event.status === 'submitted'
          ? (
              await Promise.all(
                recipients
                  .filter((person) => person.id !== event.owner_id)
                  .map(async (person) =>
                    (await canReceive(person, event.kind === 'lesson_plan')) ? person : null
                  )
              )
            ).filter((person) => person !== null)
          : recipients.filter(
              (person) => person.id === event.owner_id && person.id !== event.actor_id
            );
      if (selected.length) {
        const inserted = await supabaseAdmin.from('notifications').upsert(
          selected.map((person) => ({
            user_id: person.id,
            school_id: schoolId,
            event_key: `workflow:${event.id}`,
            ...workflowNotificationContent(event, person.role),
          })),
          { onConflict: 'user_id,event_key', ignoreDuplicates: true }
        );
        if (inserted.error) throw inserted.error;
      }
      const acknowledged = await supabaseAdmin
        .from('notification_events')
        .update({ processed_at: new Date().toISOString(), claimed_until: null })
        .eq('id', event.id)
        .eq('school_id', schoolId)
        .eq('claim_token', token);
      if (acknowledged.error) throw acknowledged.error;
    }
  } catch {
    // Retain failed events for retry; never acknowledge an undelivered event.
    await supabaseAdmin
      .from('notification_events')
      .update({ claimed_until: null })
      .eq('school_id', schoolId)
      .eq('claim_token', token)
      .is('processed_at', null);
    console.error('Workflow inbox delivery deferred');
  }
}
