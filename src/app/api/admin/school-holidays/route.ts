import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { createAnnouncementForHoliday } from 'src/lib/school-holiday-announcements';

// ----------------------------------------------------------------------

const HOLIDAY_TYPES = ['regular', 'urgent', 'special'] as const;
const ANNOUNCE_MODES = ['immediate', 'scheduled'] as const;

function isHolidayType(value: unknown): value is (typeof HOLIDAY_TYPES)[number] {
  return typeof value === 'string' && HOLIDAY_TYPES.includes(value as never);
}

function isAnnounceMode(value: unknown): value is (typeof ANNOUNCE_MODES)[number] {
  return typeof value === 'string' && ANNOUNCE_MODES.includes(value as never);
}

const HOLIDAY_SELECT =
  'id, holiday_date, name, holiday_type, announce_mode, announcement_at, announcement_id, created_at';
const LEGACY_HOLIDAY_SELECT =
  'id, holiday_date, name, holiday_type, notice_days, announce_mode, announcement_id, created_at';

function isMissingAnnouncementAt(error: { code?: string; message: string } | null) {
  return (
    !!error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    error.message.includes('announcement_at')
  );
}

function legacyAnnouncementAt(holidayDate: string, noticeDays: number | null) {
  if (noticeDays === null) return null;

  const announcementAt = new Date(`${holidayDate}T09:00:00+07:00`);
  announcementAt.setUTCDate(announcementAt.getUTCDate() - noticeDays);
  return announcementAt.toISOString();
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const result = await supabaseAdmin
    .from('school_holidays')
    .select(HOLIDAY_SELECT)
    .eq('school_id', caller.schoolId)
    .order('holiday_date');

  if (!isMissingAnnouncementAt(result.error)) {
    if (result.error) {
      return NextResponse.json({ message: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ holidays: result.data });
  }

  // Keep the list usable while the exact date-time migration is rolling out.
  // Legacy relative schedules are represented at 09:00 Asia/Bangkok.
  const legacyResult = await supabaseAdmin
    .from('school_holidays')
    .select(LEGACY_HOLIDAY_SELECT)
    .eq('school_id', caller.schoolId)
    .order('holiday_date');

  if (legacyResult.error) {
    return NextResponse.json({ message: legacyResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    holidays: (legacyResult.data ?? []).map((holiday) => ({
      ...holiday,
      announcement_at:
        holiday.announce_mode === 'scheduled'
          ? legacyAnnouncementAt(holiday.holiday_date, holiday.notice_days)
          : null,
    })),
  });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { holidayDate, name, holidayType, announcementAt, announceMode } = await request.json();
  if (typeof holidayDate !== 'string' || !holidayDate || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ message: 'กรุณาระบุวันที่และชื่อวันหยุด' }, { status: 400 });
  }
  if (holidayType !== undefined && !isHolidayType(holidayType)) {
    return NextResponse.json({ message: 'ประเภทวันหยุดไม่ถูกต้อง' }, { status: 400 });
  }
  if (announceMode !== undefined && !isAnnounceMode(announceMode)) {
    return NextResponse.json({ message: 'รูปแบบเวลาการประกาศไม่ถูกต้อง' }, { status: 400 });
  }
  const resolvedAnnounceMode = announceMode ?? 'scheduled';
  let parsedAnnouncementAt: Date | null = null;
  if (resolvedAnnounceMode === 'scheduled') {
    if (typeof announcementAt !== 'string') {
      return NextResponse.json({ message: 'กรุณาระบุวันที่และเวลาประกาศ' }, { status: 400 });
    }
    parsedAnnouncementAt = new Date(announcementAt);
    if (Number.isNaN(parsedAnnouncementAt.getTime())) {
      return NextResponse.json({ message: 'กรุณาระบุวันที่และเวลาประกาศ' }, { status: 400 });
    }
  }

  const { data: holiday, error } = await supabaseAdmin
    .from('school_holidays')
    .insert({
      school_id: caller.schoolId,
      holiday_date: holidayDate,
      name: name.trim(),
      holiday_type: holidayType ?? 'regular',
      announce_mode: resolvedAnnounceMode,
      announcement_at: parsedAnnouncementAt?.toISOString() ?? null,
    })
    .select(HOLIDAY_SELECT)
    .single();

  if (error || !holiday) {
    if (error?.code === '23505') {
      return NextResponse.json({ message: 'มีวันหยุดในวันที่นี้อยู่แล้ว' }, { status: 409 });
    }
    if (isMissingAnnouncementAt(error)) {
      return NextResponse.json(
        { message: 'ฐานข้อมูลยังไม่รองรับการเลือกวันที่และเวลาประกาศ กรุณาติดตั้ง migration ล่าสุด' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถเพิ่มวันหยุดได้' },
      { status: 500 }
    );
  }

  if (resolvedAnnounceMode === 'immediate') {
    const announcementId = await createAnnouncementForHoliday({
      id: holiday.id,
      school_id: caller.schoolId,
      holiday_date: holiday.holiday_date,
      name: holiday.name,
      holiday_type: holiday.holiday_type,
    });
    if (announcementId) holiday.announcement_id = announcementId;
  }

  return NextResponse.json({ holiday }, { status: 201 });
}
