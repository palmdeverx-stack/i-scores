import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { getTeacherWorkspaceOwner } from 'src/lib/personal-workspace-owner';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024;
const BUCKET = 'school-logos';

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;

  if (caller.role !== 'master_admin' && caller.schoolId !== id) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: 'รองรับเฉพาะไฟล์ PNG, JPEG, WEBP หรือ SVG' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ message: 'ไฟล์ต้องมีขนาดไม่เกิน 2MB' }, { status: 400 });
  }

  if (caller.role === 'teacher') {
    return uploadWorkspaceLogo(caller.sub, id, file);
  }

  const ext = file.name.split('.').pop() || 'png';
  const path = `${id}/logo.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .update({ logo_url: `${publicUrl}?v=${Date.now()}` })
    .eq('id', id)
    .select('id, name, name_en, code, logo_url, is_active, created_at')
    .single();

  if (error || !school) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถบันทึกโลโก้ได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({ school });
}

async function uploadWorkspaceLogo(teacherId: string, schoolId: string, file: File) {
  const { data: owner, error: ownerError } = await getTeacherWorkspaceOwner(teacherId, schoolId);
  if (ownerError) {
    return NextResponse.json({ message: 'ไม่สามารถตรวจสอบเจ้าของพื้นที่ได้' }, { status: 500 });
  }
  if (!owner?.auth_user_id) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขโลโก้พื้นที่' }, { status: 403 });
  }

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('schools')
    .select('logo_url')
    .eq('id', schoolId)
    .eq('workspace_type', 'personal')
    .eq('owner_auth_user_id', owner.auth_user_id)
    .maybeSingle();

  if (workspaceError) {
    return NextResponse.json({ message: 'ไม่สามารถโหลดพื้นที่ได้' }, { status: 500 });
  }
  if (!workspace) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขโลโก้พื้นที่' }, { status: 403 });
  }

  let logo: Buffer;
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 16_000_000 });
    const { format } = await input.metadata();
    if (format !== 'png' && format !== 'jpeg' && format !== 'webp')
      throw new Error('Invalid image');
    logo = await input
      .rotate()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .webp()
      .toBuffer();
  } catch {
    return NextResponse.json(
      { message: 'กรุณาเลือกไฟล์ PNG, JPEG หรือ WEBP ที่เปิดได้' },
      { status: 400 }
    );
  }

  const storage = supabaseAdmin.storage.from(BUCKET);
  const path = `${schoolId}/workspace-${randomUUID()}.webp`;
  const { error: uploadError } = await storage.upload(path, logo, { contentType: 'image/webp' });

  if (uploadError) {
    return NextResponse.json({ message: 'อัปโหลดโลโก้ไม่สำเร็จ' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = storage.getPublicUrl(path);
  const update = supabaseAdmin
    .from('schools')
    .update({ logo_url: publicUrl })
    .eq('id', schoolId)
    .eq('workspace_type', 'personal')
    .eq('owner_auth_user_id', owner.auth_user_id);

  const { data: school, error } = await (
    workspace.logo_url === null
      ? update.is('logo_url', null)
      : update.eq('logo_url', workspace.logo_url)
  )
    .select('id, name, name_en, code, logo_url, is_active, created_at')
    .maybeSingle();

  if (error || !school) {
    if (!error) await storage.remove([path]);
    return NextResponse.json(
      { message: error ? 'บันทึกโลโก้ไม่สำเร็จ' : 'ข้อมูลพื้นที่มีการเปลี่ยนแปลง กรุณาลองใหม่' },
      { status: error ? 500 : 409 }
    );
  }

  const prefix = storage.getPublicUrl(`${schoolId}/`).data.publicUrl;
  if (workspace.logo_url?.startsWith(prefix)) {
    const previous = workspace.logo_url.slice(prefix.length);
    if (/^workspace-[0-9a-f-]{36}\.webp$/u.test(previous)) {
      await storage.remove([`${schoolId}/${previous}`]);
    }
  }

  return NextResponse.json({ school });
}
