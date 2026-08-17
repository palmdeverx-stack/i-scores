import { supabaseAdmin } from 'src/lib/supabase-admin';

export const DUTY_SCHEDULE_SELECT = `
  id, duty_date, shift, starts_at, ends_at, location, note, created_at,
  recurrence_group_id, recurrence_weekdays, recurrence_until,
  assignees:school_duty_assignees(
    id, staff_id,
    staff:app_users!school_duty_assignees_staff_id_fkey(
      id, username, first_name, last_name, avatar_url
    )
  )
`;

export type DutyScheduleInput = {
  dutyDate: string;
  shift: 'morning' | 'evening' | 'full_day';
  startsAt: string;
  endsAt: string;
  location: string;
  note: string | null;
  staffIds: string[];
  weekdays: number[];
  repeatUntil: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseDutyScheduleInput(body: unknown): DutyScheduleInput | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Record<string, unknown>;
  const dutyDate = typeof input.dutyDate === 'string' ? input.dutyDate : '';
  const shift = input.shift;
  const startsAt = typeof input.startsAt === 'string' ? input.startsAt : '';
  const endsAt = typeof input.endsAt === 'string' ? input.endsAt : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : null;
  const staffIds = Array.isArray(input.staffIds)
    ? [...new Set(input.staffIds.filter((id): id is string => typeof id === 'string' && !!id))]
    : [];
  const weekdays = Array.isArray(input.weekdays)
    ? [...new Set(input.weekdays.filter((day): day is number => Number.isInteger(day)))]
    : [];
  const repeatUntil =
    typeof input.repeatUntil === 'string' && input.repeatUntil ? input.repeatUntil : null;

  if (
    !DATE_PATTERN.test(dutyDate) ||
    (shift !== 'morning' && shift !== 'evening' && shift !== 'full_day') ||
    !TIME_PATTERN.test(startsAt) ||
    !TIME_PATTERN.test(endsAt) ||
    endsAt <= startsAt ||
    !location ||
    location.length > 120 ||
    !staffIds.length ||
    staffIds.length > 30 ||
    (repeatUntil !== null &&
      (!DATE_PATTERN.test(repeatUntil) ||
        repeatUntil < dutyDate ||
        weekdays.length < 1 ||
        weekdays.length > 7 ||
        weekdays.some((day) => day < 0 || day > 6)))
  ) {
    return null;
  }

  const resolvedShift: DutyScheduleInput['shift'] =
    startsAt < '12:00' && endsAt > '12:00'
      ? 'full_day'
      : startsAt < '12:00'
        ? 'morning'
        : 'evening';

  return {
    dutyDate,
    shift: resolvedShift,
    startsAt,
    endsAt,
    location,
    note,
    staffIds,
    weekdays,
    repeatUntil,
  };
}

export async function validateDutyStaff(schoolId: string, staffIds: string[]) {
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .eq('is_active', true)
    .in('id', staffIds);

  return !error && (data?.length ?? 0) === staffIds.length;
}
