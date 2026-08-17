import { NextResponse } from 'next/server';

import { today } from 'src/utils/format-time';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .select(
      'attendance_latitude, attendance_longitude, attendance_radius_meters, attendance_require_daily_qr, attendance_qr_rotation_minutes'
    )
    .eq('id', caller.schoolId)
    .single();
  if (schoolError) return NextResponse.json({ message: schoolError.message }, { status: 500 });

  let query = supabaseAdmin
    .from('staff_work_attendance')
    .select(
      `id, work_date, checked_in_at, checked_in_distance_meters,
       checked_out_at, checked_out_distance_meters,
       staff:app_users!staff_work_attendance_staff_id_fkey(
         id, username, first_name, last_name, avatar_url
       )`
    )
    .eq('school_id', caller.schoolId)
    .order('work_date', { ascending: false })
    .order('checked_in_at', { ascending: false })
    .limit(caller.role === 'teacher' ? 31 : 200);
  if (caller.role === 'teacher') query = query.eq('staff_id', caller.sub);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  let dailyQrPayload: string | null = null;
  let nextQrRotationAt: string | null = null;
  if (caller.role === 'school_admin' && school.attendance_require_daily_qr) {
    const workDate = today('YYYY-MM-DD');
    const rotationMilliseconds = school.attendance_qr_rotation_minutes * 60_000;
    const rotationSlot = Math.floor(Date.now() / rotationMilliseconds);
    nextQrRotationAt = new Date((rotationSlot + 1) * rotationMilliseconds).toISOString();
    const { error: dailyQrCreateError } = await supabaseAdmin
      .from('staff_work_attendance_daily_qr')
      .upsert(
        { school_id: caller.schoolId, work_date: workDate, rotation_slot: rotationSlot },
        { onConflict: 'school_id,work_date', ignoreDuplicates: true }
      );
    if (dailyQrCreateError) {
      return NextResponse.json({ message: dailyQrCreateError.message }, { status: 500 });
    }
    const { data: currentQr, error: currentQrError } = await supabaseAdmin
      .from('staff_work_attendance_daily_qr')
      .select('id, rotation_slot')
      .eq('school_id', caller.schoolId)
      .eq('work_date', workDate)
      .single();
    if (currentQrError) {
      return NextResponse.json({ message: currentQrError.message }, { status: 500 });
    }
    if (currentQr && Number(currentQr.rotation_slot) !== rotationSlot) {
      const { error: rotateError } = await supabaseAdmin
        .from('staff_work_attendance_daily_qr')
        .update({ token: crypto.randomUUID(), rotation_slot: rotationSlot })
        .eq('id', currentQr.id)
        .neq('rotation_slot', rotationSlot);
      if (rotateError) {
        return NextResponse.json({ message: rotateError.message }, { status: 500 });
      }
    }
    const { data: dailyQr, error: dailyQrError } = await supabaseAdmin
      .from('staff_work_attendance_daily_qr')
      .select('token, rotation_slot')
      .eq('school_id', caller.schoolId)
      .eq('work_date', workDate)
      .single();
    if (dailyQrError) {
      return NextResponse.json({ message: dailyQrError.message }, { status: 500 });
    }
    if (dailyQr) dailyQrPayload = `ISCORE-WORK:${caller.schoolId}:${workDate}:${dailyQr.token}`;
  }

  return NextResponse.json({
    config: {
      latitude: school.attendance_latitude,
      longitude: school.attendance_longitude,
      radiusMeters: school.attendance_radius_meters,
      configured: school.attendance_latitude !== null && school.attendance_longitude !== null,
      requireDailyQr: school.attendance_require_daily_qr,
      qrRotationMinutes: school.attendance_qr_rotation_minutes,
    },
    dailyQrPayload,
    nextQrRotationAt,
    records: data ?? [],
    todayRecord: (data ?? []).find((record) => record.work_date === today('YYYY-MM-DD')) ?? null,
  });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const qrPayload = typeof body?.qrPayload === 'string' ? body.qrPayload.trim() : '';
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ message: 'ไม่พบพิกัดปัจจุบัน' }, { status: 400 });
  }

  const { data: school } = await supabaseAdmin
    .from('schools')
    .select(
      'attendance_latitude, attendance_longitude, attendance_radius_meters, attendance_require_daily_qr, attendance_qr_rotation_minutes'
    )
    .eq('id', caller.schoolId)
    .single();
  if (!school || school.attendance_latitude === null || school.attendance_longitude === null) {
    return NextResponse.json({ message: 'โรงเรียนยังไม่ได้ตั้งค่าพื้นที่ลงเวลา' }, { status: 409 });
  }

  const distance = distanceMeters(
    school.attendance_latitude,
    school.attendance_longitude,
    latitude,
    longitude
  );
  if (distance > school.attendance_radius_meters) {
    return NextResponse.json(
      { message: `อยู่นอกพื้นที่ลงเวลา (${distance} เมตรจากโรงเรียน)` },
      { status: 403 }
    );
  }

  const workDate = today('YYYY-MM-DD');
  if (school.attendance_require_daily_qr) {
    const rotationSlot = Math.floor(Date.now() / (school.attendance_qr_rotation_minutes * 60_000));
    const parts = qrPayload.split(':');
    const qrSchoolId = parts[1] ?? '';
    const qrDate = parts[2] ?? '';
    const qrToken = parts[3] ?? '';
    const { data: dailyQr } = await supabaseAdmin
      .from('staff_work_attendance_daily_qr')
      .select('id')
      .eq('school_id', caller.schoolId)
      .eq('work_date', workDate)
      .eq('token', qrToken)
      .eq('rotation_slot', rotationSlot)
      .maybeSingle();
    if (
      parts[0] !== 'ISCORE-WORK' ||
      qrSchoolId !== caller.schoolId ||
      qrDate !== workDate ||
      !dailyQr
    ) {
      return NextResponse.json({ message: 'QR ลงเวลาไม่ถูกต้องหรือหมดอายุแล้ว' }, { status: 403 });
    }
  }

  const { data: existing } = await supabaseAdmin
    .from('staff_work_attendance')
    .select('id, checked_out_at')
    .eq('staff_id', caller.sub)
    .eq('work_date', workDate)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabaseAdmin.from('staff_work_attendance').insert({
      school_id: caller.schoolId,
      staff_id: caller.sub,
      work_date: workDate,
      checked_in_at: new Date().toISOString(),
      checked_in_latitude: latitude,
      checked_in_longitude: longitude,
      checked_in_distance_meters: distance,
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ action: 'check_in', distance });
  }

  if (existing.checked_out_at) {
    return NextResponse.json({ message: 'ลงเวลาเข้าและออกงานวันนี้ครบแล้ว' }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from('staff_work_attendance')
    .update({
      checked_out_at: new Date().toISOString(),
      checked_out_latitude: latitude,
      checked_out_longitude: longitude,
      checked_out_distance_meters: distance,
    })
    .eq('id', existing.id)
    .eq('school_id', caller.schoolId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ action: 'check_out', distance });
}

export async function PATCH(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const radiusMeters = Number(body?.radiusMeters);
  const requireDailyQr = body?.requireDailyQr === true;
  const qrRotationMinutes = Number(body?.qrRotationMinutes);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isInteger(radiusMeters) ||
    radiusMeters < 20 ||
    radiusMeters > 5000 ||
    !Number.isInteger(qrRotationMinutes) ||
    qrRotationMinutes < 1 ||
    qrRotationMinutes > 60
  ) {
    return NextResponse.json({ message: 'พิกัดหรือรัศมีไม่ถูกต้อง' }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from('schools')
    .update({
      attendance_latitude: latitude,
      attendance_longitude: longitude,
      attendance_radius_meters: radiusMeters,
      attendance_require_daily_qr: requireDailyQr,
      attendance_qr_rotation_minutes: qrRotationMinutes,
    })
    .eq('id', caller.schoolId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
