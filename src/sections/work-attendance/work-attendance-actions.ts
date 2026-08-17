'use client';

export type WorkAttendanceRecord = {
  id: string;
  work_date: string;
  checked_in_at: string;
  checked_in_distance_meters: number;
  checked_out_at: string | null;
  checked_out_distance_meters: number | null;
  staff: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
};

export type WorkAttendanceData = {
  config: {
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number;
    configured: boolean;
    requireDailyQr: boolean;
    qrRotationMinutes: number;
  };
  dailyQrPayload: string | null;
  nextQrRotationAt: string | null;
  records: WorkAttendanceRecord[];
  todayRecord: WorkAttendanceRecord | null;
};

export async function getWorkAttendance(): Promise<WorkAttendanceData> {
  const response = await fetch('/api/work-attendance');
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดข้อมูลลงเวลาได้');
  return json;
}

export async function clockWork(latitude: number, longitude: number, qrPayload?: string) {
  const response = await fetch('/api/work-attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude, qrPayload }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลงเวลาได้');
  return json as { action: 'check_in' | 'check_out'; distance: number };
}

export async function saveWorkAttendanceConfig(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  requireDailyQr: boolean;
  qrRotationMinutes: number;
}) {
  const response = await fetch('/api/work-attendance', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถบันทึกพื้นที่ลงเวลาได้');
}
