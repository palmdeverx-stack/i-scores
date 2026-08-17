const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const PERIOD_TYPES = ['class', 'assembly', 'break', 'lunch', 'activity'] as const;
export type SchoolPeriodType = (typeof PERIOD_TYPES)[number];

export type SchoolTimeSettingsInput = {
  activeWeekdays: number[];
  arrivalOpenTime: string;
  schoolStartTime: string;
  lateAfterTime: string;
  schoolEndTime: string;
  departureCloseTime: string;
};

export type SchoolPeriodInput = {
  periodNumber: number;
  name: string;
  periodType: SchoolPeriodType;
  startsAt: string;
  endsAt: string;
  ringAtStart: boolean;
  ringAtEnd: boolean;
  isActive: boolean;
};

export function parseSchoolTimeSettings(body: unknown): SchoolTimeSettingsInput | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const activeWeekdays = Array.isArray(value.activeWeekdays)
    ? [...new Set(value.activeWeekdays.map(Number))].sort((left, right) => left - right)
    : [];
  const arrivalOpenTime = typeof value.arrivalOpenTime === 'string' ? value.arrivalOpenTime : '';
  const schoolStartTime = typeof value.schoolStartTime === 'string' ? value.schoolStartTime : '';
  const lateAfterTime = typeof value.lateAfterTime === 'string' ? value.lateAfterTime : '';
  const schoolEndTime = typeof value.schoolEndTime === 'string' ? value.schoolEndTime : '';
  const departureCloseTime =
    typeof value.departureCloseTime === 'string' ? value.departureCloseTime : '';

  if (
    !activeWeekdays.length ||
    activeWeekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    ![arrivalOpenTime, schoolStartTime, lateAfterTime, schoolEndTime, departureCloseTime].every(
      (time) => TIME_PATTERN.test(time)
    ) ||
    arrivalOpenTime > schoolStartTime ||
    schoolStartTime > lateAfterTime ||
    lateAfterTime >= schoolEndTime ||
    schoolEndTime > departureCloseTime
  ) {
    return null;
  }

  return {
    activeWeekdays,
    arrivalOpenTime,
    schoolStartTime,
    lateAfterTime,
    schoolEndTime,
    departureCloseTime,
  };
}

export function parseSchoolPeriod(body: unknown): SchoolPeriodInput | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const periodNumber = Number(value.periodNumber);
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const periodType = value.periodType;
  const startsAt = typeof value.startsAt === 'string' ? value.startsAt : '';
  const endsAt = typeof value.endsAt === 'string' ? value.endsAt : '';

  if (
    !Number.isInteger(periodNumber) ||
    periodNumber < 1 ||
    periodNumber > 99 ||
    !name ||
    name.length > 120 ||
    !PERIOD_TYPES.includes(periodType as SchoolPeriodType) ||
    !TIME_PATTERN.test(startsAt) ||
    !TIME_PATTERN.test(endsAt) ||
    endsAt <= startsAt
  ) {
    return null;
  }

  return {
    periodNumber,
    name,
    periodType: periodType as SchoolPeriodType,
    startsAt,
    endsAt,
    ringAtStart: value.ringAtStart === true,
    ringAtEnd: value.ringAtEnd === true,
    isActive: value.isActive !== false,
  };
}
