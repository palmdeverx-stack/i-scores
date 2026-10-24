'use client';

import { useQuery } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { getSchool } from 'src/sections/school/school-actions';

import { useAuthContext } from 'src/auth/hooks';

import { getMyDocument } from '../document-actions';
import { DocumentEditorForm } from '../components/document-editor-form';

export function DocumentEditorView({ id }: { id?: string }) {
  const { user } = useAuthContext();
  const router = useRouter();
  const params = useSearchParams();
  const root = user?.role === 'school_admin' ? '/admin/documents' : '/teacher/documents';
  const school = useQuery({
    queryKey: ['school', user?.school_id],
    queryFn: () => getSchool(user!.school_id!),
    enabled: Boolean(user?.school_id),
  });
  const doc = useQuery({
    queryKey: ['my-document', user?.school_id, user?.id, id],
    queryFn: () => getMyDocument(id!),
    enabled: Boolean(id && user?.school_id),
  });
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Typography component="h1" variant="h3">
        {id ? 'เอกสารของฉัน' : 'สร้างเอกสารจากแม่แบบ'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        เลือกตัวอย่าง แก้ไขเนื้อหา และดูพรีวิวก่อนนำไปใช้งาน
      </Typography>
      {school.isPending || (id && doc.isPending) ? (
        <CircularProgress aria-label="กำลังโหลดเอกสาร" />
      ) : school.error || doc.error ? (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                school.refetch();
                if (id) doc.refetch();
              }}
            >
              ลองใหม่
            </Button>
          }
        >
          {school.error?.message || doc.error?.message}
        </Alert>
      ) : (
        school.data && (
          <DocumentEditorForm
            key={`${user?.id}:${user?.school_id}:${id ?? 'new'}`}
            document={doc.data}
            school={school.data}
            initialTemplate={params.get('template') ?? 'memo'}
            authorName={[user?.first_name, user?.last_name].filter(Boolean).join(' ')}
            onSaved={(savedId) => router.replace(`${root}/my/${savedId}`)}
            onCancel={() => router.push(`${root}/my`)}
          />
        )
      )}
    </Container>
  );
}
