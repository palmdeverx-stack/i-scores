import 'server-only';

import { supabaseAdmin } from './supabase-admin';
import { decryptLineCredential } from './line-credentials';
import { isSubscriptionUsable } from './school-subscription';

// ----------------------------------------------------------------------

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';
type SourceType = 'homeroom_attendance' | 'class_attendance';
type EventType = 'absent' | 'leave' | 'late' | 'class_absent';

export type AttendanceNotificationInput = {
  sourceRecordId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
};

type QueueParams = {
  schoolId: string;
  sourceType: SourceType;
  attendanceDate: string;
  contextLabel: string;
  records: AttendanceNotificationInput[];
};

const STATUS_LABEL: Record<EventType, string> = {
  absent: 'ขาด',
  leave: 'ลา',
  late: 'สาย',
  class_absent: 'ไม่เข้าเรียนรายคาบ',
};

function eventTypeFor(sourceType: SourceType, status: AttendanceStatus): EventType | null {
  if (status === 'present') return null;
  if (sourceType === 'class_attendance' && status === 'absent') return 'class_absent';
  return status;
}

function eventEnabled(
  eventType: EventType,
  integration: {
    notify_absent: boolean;
    notify_leave: boolean;
    notify_late: boolean;
    notify_class_absent: boolean;
  }
) {
  if (eventType === 'absent') return integration.notify_absent;
  if (eventType === 'leave') return integration.notify_leave;
  if (eventType === 'late') return integration.notify_late;
  return integration.notify_class_absent;
}

function formatAttendanceDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export async function queueAttendanceNotifications({
  schoolId,
  sourceType,
  attendanceDate,
  contextLabel,
  records,
}: QueueParams) {
  const relevantRecords = records
    .map((record) => ({ ...record, eventType: eventTypeFor(sourceType, record.status) }))
    .filter((record): record is AttendanceNotificationInput & { eventType: EventType } =>
      Boolean(record.eventType)
    );
  if (!relevantRecords.length) return [];

  const [{ data: integration }, { data: subscription }, { data: school }] = await Promise.all([
    supabaseAdmin
      .from('school_line_integrations')
      .select(
        'is_enabled, channel_access_token_encrypted, notify_absent, notify_leave, notify_late, notify_class_absent'
      )
      .eq('school_id', schoolId)
      .maybeSingle(),
    supabaseAdmin
      .from('school_subscriptions')
      .select('status, ends_at, enabled_features, max_line_notifications')
      .eq('school_id', schoolId)
      .maybeSingle(),
    supabaseAdmin.from('schools').select('name').eq('id', schoolId).maybeSingle(),
  ]);

  if (
    !integration?.is_enabled ||
    !integration.channel_access_token_encrypted ||
    !subscription ||
    !isSubscriptionUsable(subscription as never) ||
    !(subscription.enabled_features ?? []).includes('admin.line_notifications')
  ) {
    return [];
  }

  const enabledRecords = relevantRecords.filter((record) =>
    eventEnabled(record.eventType, integration)
  );
  if (!enabledRecords.length) return [];

  const studentIds = Array.from(new Set(enabledRecords.map((record) => record.studentId)));
  const [{ data: students }, { data: guardians }] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id, username, name_prefix, first_name, last_name, student_code')
      .eq('school_id', schoolId)
      .in('id', studentIds),
    supabaseAdmin
      .from('student_guardians')
      .select('id, student_id, line_user_id, line_notifications_enabled')
      .eq('school_id', schoolId)
      .in('student_id', studentIds)
      .not('line_user_id', 'is', null)
      .eq('line_notifications_enabled', true),
  ]);

  const studentById = new Map((students ?? []).map((student) => [student.id, student]));
  const guardiansByStudent = new Map<string, typeof guardians>();
  for (const guardian of guardians ?? []) {
    const values = guardiansByStudent.get(guardian.student_id) ?? [];
    values.push(guardian);
    guardiansByStudent.set(guardian.student_id, values);
  }

  const deliveries = enabledRecords.flatMap((record) => {
    const student = studentById.get(record.studentId);
    if (!student) return [];
    const studentName =
      `${student.name_prefix ?? ''}${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
      student.username;
    const detailLines = [
      '🔔 แจ้งเตือนการเข้าเรียน',
      `โรงเรียน ${school?.name ?? ''}`,
      `นักเรียน ${studentName}`,
      student.student_code ? `รหัสนักเรียน ${student.student_code}` : '',
      `สถานะ ${STATUS_LABEL[record.eventType]}`,
      `วันที่ ${formatAttendanceDate(attendanceDate)}`,
      contextLabel,
      record.note ? `หมายเหตุ ${record.note}` : '',
    ].filter(Boolean);

    return (guardiansByStudent.get(record.studentId) ?? []).map((guardian) => ({
      school_id: schoolId,
      guardian_id: guardian.id,
      student_id: record.studentId,
      source_type: sourceType,
      source_record_id: record.sourceRecordId,
      event_type: record.eventType,
      message_text: detailLines.join('\n'),
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
    }));
  });
  if (!deliveries.length) return [];

  const { data, error } = await supabaseAdmin
    .from('line_notification_deliveries')
    .upsert(deliveries, {
      onConflict: 'guardian_id,source_type,source_record_id,event_type',
      ignoreDuplicates: true,
    })
    .select('id');
  if (error) {
    console.error('Unable to queue LINE notifications', error);
    return [];
  }
  return (data ?? []).map((row) => row.id);
}

export async function processPendingLineNotifications(schoolId: string, deliveryIds?: string[]) {
  const [{ data: integration }, { data: subscription }] = await Promise.all([
    supabaseAdmin
      .from('school_line_integrations')
      .select('is_enabled, channel_access_token_encrypted')
      .eq('school_id', schoolId)
      .maybeSingle(),
    supabaseAdmin
      .from('school_subscriptions')
      .select('status, ends_at, enabled_features, max_line_notifications')
      .eq('school_id', schoolId)
      .maybeSingle(),
  ]);
  if (
    !integration?.is_enabled ||
    !integration.channel_access_token_encrypted ||
    !subscription ||
    !isSubscriptionUsable(subscription as never) ||
    !(subscription.enabled_features ?? []).includes('admin.line_notifications')
  ) {
    return;
  }

  let query = supabaseAdmin
    .from('line_notification_deliveries')
    .select(
      'id, message_text, attempts, guardian:student_guardians!inner(line_user_id, line_notifications_enabled)'
    )
    .eq('school_id', schoolId)
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at')
    .limit(100);
  if (deliveryIds?.length) query = query.in('id', deliveryIds);

  const { data: deliveries } = await query;
  if (!deliveries?.length) return;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from('line_notification_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'sent')
    .gte('sent_at', monthStart.toISOString());

  let sentThisMonth = count ?? 0;
  const limit = subscription.max_line_notifications ?? 0;
  const accessToken = decryptLineCredential(integration.channel_access_token_encrypted);

  for (const delivery of deliveries) {
    const guardian = Array.isArray(delivery.guardian) ? delivery.guardian[0] : delivery.guardian;
    if (!guardian?.line_user_id || !guardian.line_notifications_enabled) {
      await supabaseAdmin
        .from('line_notification_deliveries')
        .update({ status: 'skipped', last_error: 'ผู้ปกครองยกเลิกการแจ้งเตือน LINE' })
        .eq('id', delivery.id);
      continue;
    }
    if (limit > 0 && sentThisMonth >= limit) {
      await supabaseAdmin
        .from('line_notification_deliveries')
        .update({ status: 'skipped', last_error: 'ครบโควตาแจ้งเตือน LINE ของแพ็กเกจแล้ว' })
        .eq('id', delivery.id);
      continue;
    }

    const nextAttempts = delivery.attempts + 1;
    const { data: claimed } = await supabaseAdmin
      .from('line_notification_deliveries')
      .update({ status: 'processing', attempts: nextAttempts })
      .eq('id', delivery.id)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: guardian.line_user_id,
          messages: [{ type: 'text', text: delivery.message_text }],
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LINE ${response.status}: ${body.slice(0, 500)}`);
      }
      await supabaseAdmin
        .from('line_notification_deliveries')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', delivery.id);
      sentThisMonth += 1;
    } catch (error) {
      const retryAt = new Date(Date.now() + 5 * 60_000 * 2 ** Math.min(nextAttempts - 1, 4));
      await supabaseAdmin
        .from('line_notification_deliveries')
        .update({
          status: nextAttempts >= 3 ? 'skipped' : 'failed',
          next_attempt_at: retryAt.toISOString(),
          last_error: error instanceof Error ? error.message.slice(0, 1000) : 'ส่ง LINE ไม่สำเร็จ',
        })
        .eq('id', delivery.id);
    }
  }
}
