import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { writeSecurityAudit } from 'src/lib/security-audit';

import {
  SCHOOL_ADMIN_USERNAME_ERROR,
  SCHOOL_ADMIN_USERNAME_PATTERN,
} from 'src/sections/school/school-admin-username';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

function canAccessSchool(
  caller: { role: string; schoolId: string | null },
  schoolId: string
): boolean {
  return caller.role === 'master_admin' || caller.schoolId === schoolId;
}

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher', 'student']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;

  if (!canAccessSchool(caller, id)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const includeAdminContact =
    caller.role === 'master_admin' &&
    new URL(request.url).searchParams.get('includeAdminContact') === '1';
  const fields =
    'id, name, name_en, code, document_prefix, document_sequence_current, logo_url, is_active, created_at, workspace_type, email';
  const result = await supabaseAdmin
    .from('schools')
    .select(`${fields}, workspace_description`)
    .eq('id', id)
    .single();

  let school = result.data;
  if (result.error?.code === '42703') {
    const { data: legacySchool, error: legacyError } = await supabaseAdmin
      .from('schools')
      .select(fields)
      .eq('id', id)
      .single();
    if (!legacyError && legacySchool) {
      school = { ...legacySchool, workspace_description: null };
    }
  }
  if (!school) {
    return NextResponse.json({ message: 'ไม่พบโรงเรียนนี้' }, { status: 404 });
  }

  const { email, ...schoolDetails } = school;
  if (!includeAdminContact) return NextResponse.json({ school: schoolDetails });

  const { data: administrator, error } = await supabaseAdmin
    .from('app_users')
    .select('id, username, email, must_change_password')
    .eq('school_id', id)
    .eq('role', 'school_admin')
    .order('created_at')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { message: 'ไม่สามารถโหลดข้อมูลบัญชีผู้ดูแลโรงเรียนได้' },
      { status: 500 }
    );
  }
  return NextResponse.json({
    school: {
      ...schoolDetails,
      email,
      adminUsername: administrator?.username ?? null,
      administratorId: administrator?.id ?? null,
      administratorEmail: administrator?.email ?? null,
      administratorNeedsPasswordChange: administrator?.must_change_password ?? false,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;

  if (!canAccessSchool(caller, id)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const {
    name,
    nameEn,
    code,
    isActive,
    documentPrefix,
    documentSequenceCurrent,
    email,
    adminUsername,
    administratorId,
  } = await request.json();

  const updatesContact = email !== undefined || adminUsername !== undefined;
  if (updatesContact && caller.role !== 'master_admin') {
    return NextResponse.json(
      { message: 'ไม่มีสิทธิ์แก้ไขข้อมูลบัญชีผู้ดูแลโรงเรียน' },
      { status: 403 }
    );
  }
  if (adminUsername !== undefined && !z.uuid().safeParse(administratorId).success) {
    return NextResponse.json(
      { message: 'กรุณาโหลดบัญชีผู้ดูแลโรงเรียนใหม่ก่อนบันทึก' },
      { status: 400 }
    );
  }
  if (
    updatesContact &&
    [isActive, documentPrefix, documentSequenceCurrent].some((value) => value !== undefined)
  ) {
    return NextResponse.json(
      { message: 'กรุณาบันทึกข้อมูลบัญชีแยกจากสถานะโรงเรียนและการตั้งค่าเอกสาร' },
      { status: 400 }
    );
  }
  if (
    adminUsername !== undefined &&
    (typeof adminUsername !== 'string' || !SCHOOL_ADMIN_USERNAME_PATTERN.test(adminUsername.trim()))
  ) {
    return NextResponse.json({ message: SCHOOL_ADMIN_USERNAME_ERROR }, { status: 400 });
  }
  if (
    email !== undefined &&
    (typeof email !== 'string' ||
      email.trim().length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
  ) {
    return NextResponse.json({ message: 'อีเมลรับคำเชิญไม่ถูกต้อง' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ message: 'กรุณากรอกชื่อโรงเรียน' }, { status: 400 });
    }
    updates.name = name.trim();
  }

  if (nameEn !== undefined) {
    if (typeof nameEn !== 'string') {
      return NextResponse.json({ message: 'ชื่อโรงเรียนภาษาอังกฤษไม่ถูกต้อง' }, { status: 400 });
    }
    updates.name_en = nameEn.trim() || null;
  }

  if (documentSequenceCurrent !== undefined) {
    if (
      !Number.isSafeInteger(documentSequenceCurrent) ||
      documentSequenceCurrent < 0 ||
      documentSequenceCurrent > 999999999999
    )
      return NextResponse.json(
        { message: 'เลขที่เอกสารล่าสุดต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 999999999999' },
        { status: 400 }
      );
    updates.document_sequence_current = documentSequenceCurrent;
  }
  if (documentPrefix !== undefined) {
    if (typeof documentPrefix !== 'string' || documentPrefix.trim().length > 100)
      return NextResponse.json(
        { message: 'เลขที่เอกสารต้องเป็นข้อความไม่เกิน 100 ตัวอักษร' },
        { status: 400 }
      );
    updates.document_prefix = documentPrefix.trim() || null;
  }

  if (code !== undefined) {
    if (caller.role !== 'master_admin') {
      return NextResponse.json(
        { message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขรหัสโรงเรียนได้' },
        { status: 403 }
      );
    }
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ message: 'กรุณากรอกรหัสโรงเรียน' }, { status: 400 });
    }
    if (!/^\d{8}$/.test(code.trim())) {
      return NextResponse.json({ message: 'รหัสโรงเรียนต้องเป็นตัวเลข 8 หลัก' }, { status: 400 });
    }

    const { data: duplicate } = await supabaseAdmin
      .from('schools')
      .select('id')
      .ilike('code', code.trim())
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({ message: 'รหัสโรงเรียนนี้ถูกใช้แล้ว' }, { status: 409 });
    }
    updates.code = code.trim();
  }

  if (isActive !== undefined) {
    if (caller.role !== 'master_admin') {
      return NextResponse.json(
        { message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปิด/ปิดการใช้งานโรงเรียนได้' },
        { status: 403 }
      );
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: 'ค่า isActive ต้องเป็น true หรือ false' },
        { status: 400 }
      );
    }
    updates.is_active = isActive;
  }

  if (updatesContact) {
    const { data: school, error } = await supabaseAdmin.rpc('update_school_admin_contact', {
      p_school_id: id,
      p_school_updates: { ...updates, ...(email !== undefined && { email: email.trim() }) },
      p_administrator_id: adminUsername === undefined ? null : administratorId,
      p_admin_username: adminUsername?.trim() ?? null,
    });
    if (error?.code === '23505') {
      const message = error.message.includes('app_users_username_key')
        ? 'ชื่อผู้ใช้งานนี้ถูกใช้แล้ว'
        : 'รหัสโรงเรียนนี้ถูกใช้แล้ว';
      return NextResponse.json({ message }, { status: 409 });
    }
    if (error?.code === 'P0002') {
      return NextResponse.json(
        { message: 'ไม่พบโรงเรียนหรือบัญชีผู้ดูแลสำหรับแก้ไข' },
        { status: 404 }
      );
    }
    if (error || !school) {
      return NextResponse.json(
        { message: 'ไม่สามารถอัปเดตข้อมูลโรงเรียนและบัญชีผู้ดูแลได้' },
        { status: 500 }
      );
    }
    await writeSecurityAudit({
      action: 'school.admin_contact_updated',
      actorUserId: caller.sub,
      schoolId: id,
      request,
      targetType: 'school',
      targetId: id,
      metadata: {
        usernameChanged: adminUsername !== undefined,
        invitationEmailChanged: email !== undefined,
      },
    });
    return NextResponse.json({ school });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
  }

  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .update(updates)
    .eq('id', id)
    .select(
      'id, name, name_en, code, document_prefix, document_sequence_current, logo_url, is_active, created_at'
    )
    .single();

  if (error || !school) {
    return NextResponse.json(
      {
        message: error?.message?.includes('counter cannot go backwards')
          ? 'เลขเอกสารล่าสุดต้องไม่น้อยกว่าค่าปัจจุบัน กรุณาโหลดข้อมูลใหม่'
          : (error?.message ?? 'ไม่สามารถอัปเดตข้อมูลโรงเรียนได้'),
      },
      { status: error?.message?.includes('counter cannot go backwards') ? 409 : 500 }
    );
  }

  if (isActive !== undefined) {
    await writeSecurityAudit({
      action: isActive ? 'school.activated' : 'school.deactivated',
      actorUserId: caller.sub,
      schoolId: id,
      request,
      targetType: 'school',
      targetId: id,
    });
  }

  return NextResponse.json({ school });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (!school) {
    return NextResponse.json({ message: 'ไม่พบโรงเรียนนี้' }, { status: 404 });
  }

  const [users, academicYears, classrooms, subjects] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', id),
    supabaseAdmin
      .from('academic_years')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', id),
    supabaseAdmin
      .from('classrooms')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', id),
    supabaseAdmin.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', id),
  ]);
  const relatedCount =
    (users.count ?? 0) +
    (academicYears.count ?? 0) +
    (classrooms.count ?? 0) +
    (subjects.count ?? 0);

  if (relatedCount > 0) {
    return NextResponse.json(
      {
        message: 'โรงเรียนนี้มีผู้ใช้งานหรือข้อมูลการเรียนอยู่ ไม่สามารถลบได้ กรุณาปิดการใช้งานแทน',
      },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.from('schools').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const { data: logoFiles } = await supabaseAdmin.storage.from('school-logos').list(id);
  if (logoFiles?.length) {
    await supabaseAdmin.storage
      .from('school-logos')
      .remove(logoFiles.map((file) => `${id}/${file.name}`));
  }

  return NextResponse.json({ success: true });
}
