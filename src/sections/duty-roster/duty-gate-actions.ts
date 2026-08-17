'use client';

export type GateAction = 'entry' | 'exit';

export async function getDutyGate(scheduleId: string) {
  const response = await fetch(`/api/teacher/duty-roster/${scheduleId}/gate-scan`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดหน้าปฏิบัติหน้าที่ได้');
  return json;
}

export async function scanDutyGate(scheduleId: string, action: GateAction, payload: string) {
  const response = await fetch(`/api/teacher/duty-roster/${scheduleId}/gate-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถบันทึกการสแกนได้');
  return json.result;
}
