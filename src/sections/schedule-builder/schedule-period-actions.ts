'use client';

// ----------------------------------------------------------------------

export type SchedulePeriod = {
  id: string;
  semester_id: string;
  period_number: number | null;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
};

export type SchedulePeriodInput = {
  semesterId: string;
  periodNumber: number | null;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
};

async function parseResponse(response: Response) {
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'Failed to manage schedule periods');
  return json;
}

export async function listSchedulePeriods(semesterId: string): Promise<SchedulePeriod[]> {
  const response = await fetch(`/api/schedule-periods?semesterId=${semesterId}`);
  const json = await parseResponse(response);
  return json.periods;
}

export async function createSchedulePeriod(params: SchedulePeriodInput): Promise<SchedulePeriod> {
  const response = await fetch('/api/schedule-periods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await parseResponse(response);
  return json.period;
}

export async function updateSchedulePeriod(
  id: string,
  params: SchedulePeriodInput
): Promise<SchedulePeriod> {
  const response = await fetch(`/api/schedule-periods/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await parseResponse(response);
  return json.period;
}

export async function deleteSchedulePeriod(id: string): Promise<void> {
  const response = await fetch(`/api/schedule-periods/${id}`, { method: 'DELETE' });
  await parseResponse(response);
}

export async function syncSchedulePeriods(semesterId: string): Promise<{
  created: number;
  updated: number;
  deleted: number;
}> {
  const response = await fetch('/api/schedule-periods/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ semesterId }),
  });
  const json = await parseResponse(response);
  return json.result;
}

export async function getSchedulePeriodSyncStatus(semesterId: string): Promise<{
  canUndo: boolean;
  syncedAt: string | null;
}> {
  const response = await fetch(`/api/schedule-periods/sync?semesterId=${semesterId}`);
  return parseResponse(response);
}

export async function undoSchedulePeriodSync(semesterId: string): Promise<{
  restoredPeriods: number;
  syncRunId: string;
}> {
  const response = await fetch(`/api/schedule-periods/sync?semesterId=${semesterId}`, {
    method: 'DELETE',
  });
  const json = await parseResponse(response);
  return json.result;
}
