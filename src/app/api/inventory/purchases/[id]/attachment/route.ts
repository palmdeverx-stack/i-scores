import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

const BUCKET = 'inventory-purchase-orders';
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request, context: Context, write = false) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId) return null;
  const allowed = write
    ? await canManageViaPermission(caller, 'inventory.manage')
    : (await canViewViaPermission(caller, 'inventory.manage')) ||
      (await canViewViaPermission(caller, 'inventory.approve'));
  if (!allowed) return null;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await supabaseAdmin
    .from('inventory_purchases')
    .select('id,status,attachment_path')
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .maybeSingle();
  return data ? { caller, purchase: data } : null;
}
export async function GET(request: Request, context: Context) {
  const access = await authorize(request, context);
  if (!access?.purchase.attachment_path) return new NextResponse(null, { status: 404 });
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(access.purchase.attachment_path, 60);
  if (error || !data) return new NextResponse(null, { status: 500 });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export async function POST(request: Request, context: Context) {
  const access = await authorize(request, context, true);
  if (!access) return NextResponse.json({ message: 'ไม่มีสิทธิ์แนบใบสั่งซื้อ' }, { status: 403 });
  if (access.purchase.status !== 'approved')
    return NextResponse.json(
      { message: 'แนบหรือเปลี่ยนใบสั่งซื้อได้หลังอนุมัติและก่อนบันทึกสั่งซื้อ' },
      { status: 409 }
    );
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !file.size || file.size > 10485760)
    return NextResponse.json(
      { message: 'กรุณาเลือก PDF หรือรูปภาพขนาดไม่เกิน 10 MB' },
      { status: 400 }
    );
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension =
    file.type === 'application/pdf' && buffer.toString('ascii', 0, 5) === '%PDF-'
      ? 'pdf'
      : file.type === 'image/png' &&
          buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'png'
        : file.type === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
          ? 'jpg'
          : file.type === 'image/webp' &&
              buffer.toString('ascii', 0, 4) === 'RIFF' &&
              buffer.toString('ascii', 8, 12) === 'WEBP'
            ? 'webp'
            : null;
  if (!extension)
    return NextResponse.json(
      { message: 'ไฟล์ต้องเป็น PDF, JPG, PNG หรือ WebP ที่ถูกต้อง' },
      { status: 400 }
    );
  const path = `${access.caller.schoolId}/${access.purchase.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type });
  if (error) return NextResponse.json({ message: 'อัปโหลดใบสั่งซื้อไม่สำเร็จ' }, { status: 500 });
  const saved = await supabaseAdmin
    .from('inventory_purchases')
    .update({ attachment_path: path })
    .eq('id', access.purchase.id)
    .eq('school_id', access.caller.schoolId)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (saved.error || !saved.data) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ message: 'สถานะเปลี่ยนไปแล้ว กรุณาโหลดใหม่' }, { status: 409 });
  }
  if (access.purchase.attachment_path)
    await supabaseAdmin.storage.from(BUCKET).remove([access.purchase.attachment_path]);
  return NextResponse.json({ success: true });
}
