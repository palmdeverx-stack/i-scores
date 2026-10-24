import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

const BUCKET = 'inventory-images';
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request, context: Context, write = false) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (
    !caller?.schoolId ||
    !(await (write ? canManageViaPermission : canViewViaPermission)(caller, 'inventory.manage'))
  )
    return null;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await supabaseAdmin
    .from('inventory_items')
    .select('id, image_path')
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .maybeSingle();
  return data ? { caller, item: data } : null;
}
export async function GET(request: Request, context: Context) {
  const access = await authorize(request, context);
  if (!access?.item.image_path) return new NextResponse(null, { status: 404 });
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(access.item.image_path, 60);
  if (error || !data) return new NextResponse(null, { status: 500 });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export async function POST(request: Request, context: Context) {
  const access = await authorize(request, context, true);
  if (!access) return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขรูปพัสดุ' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 5242880 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  ) {
    return NextResponse.json(
      { message: 'เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB' },
      { status: 400 }
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  const extension =
    file.type === 'image/png' && png
      ? 'png'
      : file.type === 'image/jpeg' && jpeg
        ? 'jpg'
        : file.type === 'image/webp' && webp
          ? 'webp'
          : null;
  if (!extension)
    return NextResponse.json({ message: 'รูปแบบไฟล์รูปภาพไม่ถูกต้อง' }, { status: 400 });
  const path = `${access.caller.schoolId}/${access.item.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type });
  if (error) return NextResponse.json({ message: 'อัปโหลดรูปไม่สำเร็จ' }, { status: 500 });
  const saved = await supabaseAdmin
    .from('inventory_items')
    .update({ image_path: path })
    .eq('id', access.item.id)
    .eq('school_id', access.caller.schoolId)
    .select('id')
    .maybeSingle();
  if (saved.error || !saved.data) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ message: 'บันทึกรูปไม่สำเร็จ' }, { status: 500 });
  }
  if (access.item.image_path)
    await supabaseAdmin.storage.from(BUCKET).remove([access.item.image_path]);
  return NextResponse.json({ success: true });
}
export async function DELETE(request: Request, context: Context) {
  const access = await authorize(request, context, true);
  if (!access) return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขรูปพัสดุ' }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from('inventory_items')
    .update({ image_path: null })
    .eq('id', access.item.id)
    .eq('school_id', access.caller.schoolId)
    .select('id')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ message: 'ลบรูปไม่สำเร็จ' }, { status: 500 });
  if (access.item.image_path)
    await supabaseAdmin.storage.from(BUCKET).remove([access.item.image_path]);
  return NextResponse.json({ success: true });
}
