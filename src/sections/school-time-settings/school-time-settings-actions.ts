'use client';

export type SchoolPeriodType = 'class' | 'assembly' | 'break' | 'lunch' | 'activity';

export type SchoolTimeSettings = {
  timezone: string;
  active_weekdays: number[];
  arrival_open_time: string;
  school_start_time: string;
  late_after_time: string;
  school_end_time: string;
  departure_close_time: string;
  bell_sync_enabled: boolean;
};

export type SchoolPeriod = {
  id: string;
  period_number: number;
  name: string;
  period_type: SchoolPeriodType;
  starts_at: string;
  ends_at: string;
  ring_at_start: boolean;
  ring_at_end: boolean;
  is_active: boolean;
  created_at: string;
};

export type SchoolTimeData = { settings: SchoolTimeSettings; periods: SchoolPeriod[] };

export type SaveTimeSettingsInput = {
  activeWeekdays: number[];
  arrivalOpenTime: string;
  schoolStartTime: string;
  lateAfterTime: string;
  schoolEndTime: string;
  departureCloseTime: string;
};

export type SaveSchoolPeriodInput = {
  periodNumber: number;
  name: string;
  periodType: SchoolPeriodType;
  startsAt: string;
  endsAt: string;
  ringAtStart: boolean;
  ringAtEnd: boolean;
  isActive: boolean;
};

export async function getSchoolTimeSettings(): Promise<SchoolTimeData> {
  const response = await fetch('/api/admin/school-time-settings');
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดเวลาเรียนได้');
  return json;
}

export async function saveSchoolTimeSettings(input: SaveTimeSettingsInput) {
  const response = await fetch('/api/admin/school-time-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถบันทึกเวลาเรียนได้');
}

export async function createSchoolPeriod(input: SaveSchoolPeriodInput) {
  const response = await fetch('/api/admin/school-time-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถเพิ่มคาบเรียนได้');
}

export async function updateSchoolPeriod(id: string, input: SaveSchoolPeriodInput) {
  const response = await fetch(`/api/admin/school-time-settings/periods/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถแก้ไขคาบเรียนได้');
}

export async function deleteSchoolPeriod(id: string) {
  const response = await fetch(`/api/admin/school-time-settings/periods/${id}`, {
    method: 'DELETE',
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบคาบเรียนได้');
}
