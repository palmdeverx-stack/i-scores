import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  loadTeacherAssignment,
  canAccessTeacherAssignment,
} from 'src/lib/teacher-assignment-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

const BUCKET = 'assignment-attachments';
const MAX_FILES = 8;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];
const FILE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
};
const VALID_CATEGORIES = ['assignment', 'quiz', 'midterm', 'final', 'other'];
const SINGLETON_CATEGORIES = ['midterm', 'final'];
const SINGLETON_CATEGORY_LABELS: Record<string, string> = {
  midterm: 'คะแนนสอบกลางภาค',
  final: 'คะแนนสอบปลายภาค',
};

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('assignments')
    .select(
      `id, title, description, full_score, due_at, category, created_at,
       attachments:assignment_attachments(id, file_name, file_url, mime_type, file_size, created_at)`
    )
    .eq('teacher_assignment_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data });
}

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const isMultipart = request.headers.get('content-type')?.includes('multipart/form-data');
  const body = isMultipart ? await request.formData() : await request.json();
  const title = isMultipart ? body.get('title') : body.title;
  const description = isMultipart ? body.get('description') : body.description;
  const fullScore = isMultipart ? body.get('fullScore') : body.fullScore;
  const dueAt = isMultipart ? body.get('dueAt') : body.dueAt;
  const category = isMultipart ? body.get('category') : body.category;
  const files = isMultipart
    ? body
        .getAll('files')
        .filter((file: FormDataEntryValue): file is File => file instanceof File && file.size > 0)
    : [];

  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';

  if (!normalizedTitle || normalizedTitle.length > 200) {
    return NextResponse.json({ message: 'กรุณากรอกชื่องาน' }, { status: 400 });
  }
  if (normalizedDescription.length > 5000) {
    return NextResponse.json({ message: 'รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร' }, { status: 400 });
  }

  const normalizedCategory = typeof category === 'string' && category ? category : 'assignment';
  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return NextResponse.json({ message: 'หมวดหมู่คะแนนไม่ถูกต้อง' }, { status: 400 });
  }

  if (SINGLETON_CATEGORIES.includes(normalizedCategory)) {
    const { data: existing } = await supabaseAdmin
      .from('assignments')
      .select('id')
      .eq('teacher_assignment_id', id)
      .eq('category', normalizedCategory)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { message: `มี${SINGLETON_CATEGORY_LABELS[normalizedCategory]}อยู่แล้ว กรุณาแก้ไขรายการเดิมแทน` },
        { status: 409 }
      );
    }
  }

  const parsedFullScore = fullScore !== undefined ? Number(fullScore) : 100;

  if (!Number.isFinite(parsedFullScore) || parsedFullScore <= 0) {
    return NextResponse.json({ message: 'คะแนนเต็มต้องมากกว่า 0' }, { status: 400 });
  }

  const parsedDueAt = typeof dueAt === 'string' && dueAt.trim() ? new Date(dueAt) : null;
  if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) {
    return NextResponse.json({ message: 'วันและเวลาครบกำหนดส่งไม่ถูกต้อง' }, { status: 400 });
  }
  if (parsedDueAt && parsedDueAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { message: 'วันและเวลาครบกำหนดส่งต้องเป็นเวลาในอนาคต' },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ message: `แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์` }, { status: 400 });
  }
  const invalidFile = files.find(
    (file: File) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
  );
  if (invalidFile) {
    return NextResponse.json(
      { message: `ไฟล์ “${invalidFile.name}” ไม่รองรับหรือมีขนาดเกิน 10MB` },
      { status: 400 }
    );
  }

  const { data: assignment, error } = await supabaseAdmin
    .from('assignments')
    .insert({
      teacher_assignment_id: id,
      title: normalizedTitle,
      description: normalizedDescription || null,
      full_score: parsedFullScore,
      due_at: parsedDueAt?.toISOString() ?? null,
      category: normalizedCategory,
    })
    .select('id, title, description, full_score, due_at, category, created_at')
    .single();

  if (error || !assignment) {
    if (error?.code === '23505') {
      return NextResponse.json(
        {
          message: `มี${SINGLETON_CATEGORY_LABELS[normalizedCategory] ?? 'รายการนี้'}อยู่แล้ว กรุณาแก้ไขรายการเดิมแทน`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถสร้างงานได้' },
      { status: 500 }
    );
  }

  if (files.length) {
    const uploadedPaths: string[] = [];

    try {
      const attachments = [];
      for (const file of files) {
        const extension = FILE_EXTENSIONS[file.type];
        const classroom = teacherAssignment!.classrooms as unknown as { school_id: string };
        const storagePath = `${classroom.school_id}/${assignment.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(storagePath, file, { contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);

        uploadedPaths.push(storagePath);
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
        attachments.push({
          assignment_id: assignment.id,
          file_name: file.name,
          file_url: publicUrl,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
        });
      }

      const { error: attachmentError } = await supabaseAdmin
        .from('assignment_attachments')
        .insert(attachments);
      if (attachmentError) throw new Error(attachmentError.message);
    } catch (attachmentError) {
      if (uploadedPaths.length) await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths);
      await supabaseAdmin.from('assignments').delete().eq('id', assignment.id);
      return NextResponse.json(
        {
          message:
            attachmentError instanceof Error
              ? attachmentError.message
              : 'ไม่สามารถอัปโหลดไฟล์แนบได้',
        },
        { status: 500 }
      );
    }
  }

  const { data: createdAssignment } = await supabaseAdmin
    .from('assignments')
    .select(
      `id, title, description, full_score, due_at, category, created_at,
       attachments:assignment_attachments(id, file_name, file_url, mime_type, file_size, created_at)`
    )
    .eq('id', assignment.id)
    .single();

  return NextResponse.json({ assignment: createdAssignment ?? assignment }, { status: 201 });
}
