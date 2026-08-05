import type { LessonPlanTemplateContent } from 'src/features/templates/types';

import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { canEditTemplate, getTemplateById } from 'src/features/templates/server/template-service';

type Context = { params: Promise<{ id: string }> };

const BUCKET = 'lesson-plan-template-logos';
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

async function editableTemplate(request: Request, id: string) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  if (!caller) return null;
  const template = await getTemplateById(id);
  if (!template || template.template_type !== 'lesson_plan') return null;
  return (await canEditTemplate(caller, template)) ? { caller, template } : null;
}

async function removeFolder(folder: string) {
  const { data: files, error } = await supabaseAdmin.storage.from(BUCKET).list(folder);
  if (error) return error;
  if (!files?.length) return null;
  const { error: removeError } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove(files.map((file) => `${folder}/${file.name}`));
  return removeError;
}

async function saveLogoUrl(id: string, content: LessonPlanTemplateContent, logoUrl: string) {
  const nextContent: LessonPlanTemplateContent = {
    ...content,
    cover: { ...content.cover, logoUrl },
  };
  return supabaseAdmin.from('templates').update({ content: nextContent }).eq('id', id);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const editable = await editableTemplate(request, id);
  if (!editable)
    return NextResponse.json({ message: 'ไม่พบ Template หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ message: 'กรุณาเลือกไฟล์โลโก้' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ message: 'รองรับเฉพาะไฟล์ PNG, JPEG หรือ WEBP' }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ message: 'โลโก้ต้องมีขนาดไม่เกิน 2MB' }, { status: 400 });

  const folder = `${editable.caller.sub}/${id}`;
  const removeError = await removeFolder(folder);
  if (removeError) return NextResponse.json({ message: removeError.message }, { status: 500 });

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${folder}/logo.${extension}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return NextResponse.json({ message: uploadError.message }, { status: 500 });

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const logoUrl = `${publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await saveLogoUrl(
    id,
    editable.template.content as LessonPlanTemplateContent,
    logoUrl
  );
  if (updateError) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ logoUrl });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const editable = await editableTemplate(request, id);
  if (!editable)
    return NextResponse.json({ message: 'ไม่พบ Template หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });

  const removeError = await removeFolder(`${editable.caller.sub}/${id}`);
  if (removeError) return NextResponse.json({ message: removeError.message }, { status: 500 });

  const { error } = await saveLogoUrl(
    id,
    editable.template.content as LessonPlanTemplateContent,
    ''
  );
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
