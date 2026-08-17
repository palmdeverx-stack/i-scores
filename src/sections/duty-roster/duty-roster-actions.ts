'use client';

export type DutyShift = 'morning' | 'evening' | 'full_day';

export type DutyStaff = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export type DutySchedule = {
  id: string;
  duty_date: string;
  shift: DutyShift;
  starts_at: string;
  ends_at: string;
  location: string;
  note: string | null;
  created_at: string;
  recurrence_group_id: string | null;
  recurrence_weekdays: number[] | null;
  recurrence_until: string | null;
  assignees: Array<{ id: string; staff_id: string; staff: DutyStaff }>;
};

export type DutyRosterData = { schedules: DutySchedule[]; staff: DutyStaff[] };

export type SaveDutyScheduleInput = {
  dutyDate: string;
  shift: DutyShift;
  startsAt: string;
  endsAt: string;
  location: string;
  note: string;
  staffIds: string[];
  weekdays: number[];
  repeatUntil: string | null;
};

export async function getDutyRoster(): Promise<DutyRosterData> {
  const response = await fetch('/api/admin/duty-roster');
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดตารางครูเวรได้');
  return json;
}

export type MyDutyRosterPage = {
  schedules: DutySchedule[];
  nextPage: number | null;
};

export async function getMyDutyRosterPage(page: number, pageSize = 20): Promise<MyDutyRosterPage> {
  const response = await fetch(`/api/teacher/duty-roster?page=${page}&pageSize=${pageSize}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดเวรของฉันได้');
  return json;
}

export async function getMyDutyRosterCalendar(): Promise<DutySchedule[]> {
  const response = await fetch('/api/teacher/duty-roster?mode=calendar');
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดเวรของฉันได้');
  return json.schedules;
}

export async function createDutySchedule(input: SaveDutyScheduleInput) {
  const response = await fetch('/api/admin/duty-roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถเพิ่มตารางครูเวรได้');
}

export async function updateDutySchedule(id: string, input: SaveDutyScheduleInput) {
  const response = await fetch(`/api/admin/duty-roster/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถแก้ไขตารางครูเวรได้');
}

export async function deleteDutySchedule(id: string) {
  const response = await fetch(`/api/admin/duty-roster/${id}`, { method: 'DELETE' });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบตารางครูเวรได้');
}
