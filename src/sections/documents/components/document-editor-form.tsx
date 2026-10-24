'use client';

import type { UserDocument } from '../document-actions';
import type { SchoolProfile } from 'src/sections/school/school-actions';

import { z } from 'zod';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { createMyDocument, updateMyDocument } from '../document-actions';
import { DocumentContentSchema, templateDocumentContent } from '../document-content';
import { SCHOOL_DOCUMENT_TEMPLATES, getSchoolDocumentTemplate } from '../document-catalog';

const Preview = dynamic(() => import('./editable-document-preview'), {
  ssr: false,
  loading: () => <Typography role="status">กำลังเตรียมพรีวิว…</Typography>,
});
const Schema = z.object({
  templateSlug: z.string().min(1, 'กรุณาเลือกแม่แบบ'),
  title: z.string().trim().min(1, 'กรุณากรอกชื่อเอกสาร').max(200),
  purpose: z.string().trim().max(1000),
  content: DocumentContentSchema,
});
type Values = z.infer<typeof Schema>;
export function DocumentEditorForm({
  document,
  initialTemplate,
  school,
  authorName,
  onSaved,
  onCancel,
}: {
  document?: UserDocument;
  initialTemplate: string;
  school: SchoolProfile;
  authorName: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const readOnly = Boolean(document && !['draft', 'reserved'].includes(document.status));
  const [today] = useState(() => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10));
  const initial =
    getSchoolDocumentTemplate(document?.template_slug ?? initialTemplate) ??
    SCHOOL_DOCUMENT_TEMPLATES[0];
  const nextDocumentNumber = `${(school.document_prefix ?? '').replace(/\/+$/, '')}${school.document_prefix ? '/' : ''}${Number(school.document_sequence_current ?? 0) + 1}`;
  const defaults = {
    templateSlug: initial.slug,
    title: document?.title ?? initial.name,
    purpose: document?.purpose ?? '',
    content:
      document?.content ??
      templateDocumentContent(
        initial,
        school.name,
        school.document_prefix ?? '',
        authorName,
        document?.planned_date ?? today
      ),
  };
  if (document?.status === 'reserved' && !document.content) {
    defaults.content = {
      ...defaults.content,
      subject: document.title,
      body: '',
      sections: defaults.content.sections.map((section) => ({ ...section, text: '' })),
    };
  }
  defaults.content = {
    ...defaults.content,
    documentNumber:
      document?.document_number ?? (document?.content?.documentNumber || nextDocumentNumber),
  };
  const methods = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: defaults,
    mode: 'onBlur',
  });
  const slug = useWatch({ control: methods.control, name: 'templateSlug' });
  const sections = useWatch({ control: methods.control, name: 'content.sections' });
  const memo = slug === 'memo';
  const [preview, setPreview] = useState<Values | null>(defaults);
  const watchedValues = useWatch({ control: methods.control });
  const previewInput = JSON.stringify(watchedValues);
  useEffect(() => {
    const timer = setTimeout(() => {
      const values = JSON.parse(previewInput);
      const template = getSchoolDocumentTemplate(values.templateSlug);
      // Metadata such as an empty title must not prevent body preview updates.
      const parsed = Schema.safeParse({
        ...values,
        title: values.title?.trim() || template?.name || 'เอกสาร',
      });
      if (parsed.success) setPreview(parsed.data);
    }, 500);
    return () => clearTimeout(timer);
  }, [previewInput]);
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      document ? updateMyDocument(document.id, values) : createMyDocument(values),
    onSuccess: async (saved) => {
      toast.success(document ? 'บันทึกการแก้ไขเอกสารแล้ว' : 'สร้างเอกสารฉบับร่างแล้ว');
      if (saved.document_number) methods.setValue('content.documentNumber', saved.document_number);
      setPreview({
        templateSlug: saved.template_slug,
        title: saved.title,
        purpose: saved.purpose ?? '',
        content: saved.content ?? methods.getValues('content'),
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['my-documents'] }),
        client.invalidateQueries({ queryKey: ['my-document'] }),
        client.invalidateQueries({ queryKey: ['school', school.id] }),
      ]);
      onSaved(saved.id);
    },
  });
  return (
    <Form methods={methods} onSubmit={methods.handleSubmit((values) => mutation.mutate(values))}>
      <Box sx={{ display: 'grid', gap: 3 }}>
        {document?.status === 'reserved' && (
          <Alert severity="info">
            จองเลข {document.document_number} ไว้แล้ว
            {document.planned_date ? ` · วางแผนจัดทำวันที่ ${document.planned_date}` : ''}{' '}
            สามารถเติมเนื้อหาภายหลังได้ เมื่อบันทึกจะเปลี่ยนเป็นฉบับร่างโดยใช้เลขเดิม
          </Alert>
        )}
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        {readOnly && (
          <Alert severity="info">เอกสารนี้ไม่ใช่ฉบับร่าง ดูและดาวน์โหลดได้ แต่แก้ไขไม่ได้</Alert>
        )}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) minmax(0,1fr)' },
          }}
        >
          <Box sx={{ minWidth: 0, display: 'grid', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              พรีวิวอัปเดตอัตโนมัติหลังหยุดพิมพ์ครู่หนึ่ง การแก้ไขยังไม่ถูกบันทึกจนกดบันทึกฉบับร่าง
            </Typography>
            <Button
              variant="outlined"
              onClick={methods.handleSubmit((values) => setPreview(values))}
            >
              อัปเดตพรีวิว / ดาวน์โหลด PDF
            </Button>
            {preview ? (
              <Preview
                content={preview.content}
                title={preview.title}
                template={getSchoolDocumentTemplate(preview.templateSlug)!}
              />
            ) : (
              <Alert severity="info">กำลังเตรียมพรีวิวจากเนื้อหาล่าสุด</Alert>
            )}
          </Box>

          <Box
            component="fieldset"
            disabled={readOnly || mutation.isPending}
            sx={{ m: 0, p: 0, border: 0, display: 'grid', gap: 3, minWidth: 0 }}
          >
            <Card variant="outlined" sx={{ p: 3, display: 'grid', gap: 2 }}>
              <Typography variant="h6">1. เลือกแม่แบบ</Typography>
              <Field.Select
                name="templateSlug"
                label="ตัวอย่าง / แม่แบบเอกสาร"
                disabled={readOnly || mutation.isPending}
                onChange={(event) => {
                  const template = getSchoolDocumentTemplate(event.target.value);
                  if (!template) return;
                  methods.reset({
                    templateSlug: template.slug,
                    title: template.name,
                    purpose: '',
                    content: templateDocumentContent(
                      template,
                      school.name,
                      school.document_prefix ?? '',
                      authorName,
                      today
                    ),
                  });
                  methods.setValue(
                    'content.documentNumber',
                    document?.document_number ?? nextDocumentNumber
                  );
                  setPreview(null);
                }}
              >
                {SCHOOL_DOCUMENT_TEMPLATES.map((template) => (
                  <MenuItem key={template.slug} value={template.slug}>
                    {template.code} · {template.name}
                  </MenuItem>
                ))}
              </Field.Select>
              <Alert severity="info">
                เลือกแม่แบบเพื่อคัดลอกข้อความตัวอย่างมาแก้ไข
                การเปลี่ยนแม่แบบจะเริ่มเนื้อหาใหม่เฉพาะฉบับนี้
              </Alert>
              <Field.Text name="title" label="ชื่อเอกสารของฉัน" required />
              <Field.Text
                name="purpose"
                label="วัตถุประสงค์ / หมายเหตุภายใน"
                multiline
                minRows={2}
              />
            </Card>
            <Card variant="outlined" sx={{ p: 3, display: 'grid', gap: 2 }}>
              <Typography variant="h6">2. ข้อมูลหัวเอกสาร</Typography>
              <Field.Text name="content.schoolName" label="ชื่อโรงเรียน" />
              {memo && <Field.Text name="content.department" label="ส่วนราชการ / หน่วยงาน" />}
              <Box
                sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
              >
                <Field.Text
                  name="content.documentNumber"
                  label="เลขที่เอกสาร"
                  slotProps={{ htmlInput: { readOnly: true } }}
                  disabled
                  helperText="ระบบรันเลขจริงตอนบันทึกฉบับใหม่ เลขที่เห็นก่อนบันทึกเป็นเลขประมาณการ"
                />
                <Field.Text
                  name="content.documentDate"
                  label="วันที่เอกสาร"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <Field.Text name="content.subject" label="เรื่อง" />
              <Field.Text name="content.recipient" label="เรียน / ผู้รับ" />
            </Card>
            <Card variant="outlined" sx={{ p: 3, display: 'grid', gap: 2 }}>
              <Typography variant="h6">3. แก้ไขเนื้อหา</Typography>
              <Field.Text
                name="content.body"
                label={memo ? 'เนื้อความ' : 'ข้อความเพิ่มเติม'}
                multiline
                minRows={memo ? 12 : 3}
              />
              {!memo &&
                sections.map((section, index) => (
                  <Box key={index} sx={{ display: 'grid', gap: 1.5 }}>
                    <Field.Text
                      name={`content.sections.${index}.title`}
                      label={`หัวข้อที่ ${index + 1}`}
                    />
                    <Field.Text
                      name={`content.sections.${index}.text`}
                      label="เนื้อหา"
                      multiline
                      minRows={4}
                    />
                  </Box>
                ))}
            </Card>
            <Card variant="outlined" sx={{ p: 3, display: 'grid', gap: 2 }}>
              <Typography variant="h6">4. ผู้ลงนาม</Typography>
              <Field.Text name="content.authorName" label="ชื่อผู้จัดทำ / ผู้ลงนาม" />
              <Field.Text name="content.authorPosition" label="ตำแหน่ง" />
              {memo && (
                <>
                  <Field.Text
                    name="content.reviewText"
                    label="ความเห็น / ข้อสั่งการ"
                    multiline
                    minRows={3}
                  />
                  <Field.Text name="content.approverName" label="ชื่อผู้พิจารณา (ถ้ามี)" />
                  <Field.Text name="content.approverPosition" label="ตำแหน่งผู้พิจารณา" />
                </>
              )}
            </Card>
          </Box>
        </Box>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            position: 'sticky',
            bottom: 16,
            zIndex: 5,
            boxShadow: (theme) => theme.vars.customShadows.z8,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button color="inherit" disabled={mutation.isPending} onClick={onCancel}>
              กลับหน้ารายการ
            </Button>
            {!readOnly && (
              <Button type="submit" variant="contained" loading={mutation.isPending}>
                {document?.status === 'reserved'
                  ? 'บันทึกเนื้อหาโดยใช้เลขที่จอง'
                  : 'บันทึกฉบับร่าง'}
              </Button>
            )}
          </Box>
        </Card>
      </Box>
    </Form>
  );
}
