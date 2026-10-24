'use client';

import type { SchoolDocumentTemplate } from '../document-catalog';
import type { ScoreReport } from 'src/sections/teacher-assignment/score-report-actions';
import type { GradeReviewSubmission } from 'src/sections/grade-review/grade-review-actions';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import { pdfjs, Page as PdfPage, Document as PdfPages } from 'react-pdf';
import {
  Font,
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  BlobProvider,
  PDFDownloadLink,
} from '@react-pdf/renderer';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { RemixIcon } from 'src/components/remix-icon';

import { getSchool } from 'src/sections/school/school-actions';
import { GradeResultDocument } from 'src/sections/grade-review/components/grade-result-pdf-dialog';

import { useAuthContext } from 'src/auth/hooks';

import { MemoExampleDocument } from './memo-example-document';

// ----------------------------------------------------------------------

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

Font.register({
  family: 'LINE Seed Sans TH',
  fonts: [
    { src: '/fonts/LINESeedSansTH-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/LINESeedSansTH-Bold.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'LINE Seed Sans TH', color: '#111827' },
  sample: { textAlign: 'center', color: '#9CA3AF', fontSize: 8 },
  title: { marginTop: 18, fontSize: 18, fontWeight: 700, textAlign: 'center' },
  school: { marginTop: 4, fontSize: 11, textAlign: 'center' },
  meta: {
    marginTop: 20,
    padding: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    border: '1 solid #374151',
  },
  section: { marginTop: 14 },
  sectionTitle: { padding: 5, fontWeight: 700, backgroundColor: '#E5E7EB' },
  lines: { padding: 10, border: '1 solid #9CA3AF', borderTop: 0 },
  line: { marginBottom: 7, borderBottom: '1 dotted #9CA3AF' },
  signatures: {
    marginTop: 34,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  signature: { width: 210, textAlign: 'center' },
});

const SAMPLE_PP5_REPORT: ScoreReport = {
  teacherAssignmentId: 'sample',
  semesterId: 'sample-semester',
  schoolName: 'โรงเรียนตัวอย่าง',
  schoolLogoUrl: null,
  teacher: { firstName: 'ครู', lastName: 'ตัวอย่าง', username: 'teacher' },
  subject: { name: 'ภาษาไทย', code: 'ท101', credits: 1.5 },
  classroom: { id: 'sample-classroom', name: '1', gradeLevel: 'ป.6', academicYear: '2569' },
  semesterName: '1',
  assignments: [
    { id: 'work', title: 'งานระหว่างเรียน', category: 'assignment', fullScore: 30 },
    { id: 'quiz', title: 'แบบทดสอบ', category: 'quiz', fullScore: 10 },
    { id: 'midterm', title: 'กลางภาค', category: 'midterm', fullScore: 20 },
    { id: 'final', title: 'ปลายภาค', category: 'final', fullScore: 35 },
    { id: 'other', title: 'จิตพิสัย', category: 'other', fullScore: 5 },
  ],
  students: [
    ['65001', 'เด็กชายตัวอย่าง', 'หนึ่ง', [27, 9, 18, 32, 5]],
    ['65002', 'เด็กหญิงตัวอย่าง', 'สอง', [23, 8, 15, 27, 4]],
    ['65003', 'เด็กชายตัวอย่าง', 'สาม', [19, 7, 12, 22, 3]],
  ].map(([code, firstName, lastName, values], index) => ({
    id: String(index + 1),
    studentNumber: String(index + 1),
    studentCode: String(code),
    nationalId: null,
    username: String(code),
    firstName: String(firstName),
    lastName: String(lastName),
    nickname: null,
    specialResult: index === 2 ? ('ร' as const) : null,
    desirableAttributesLevel: index === 0 ? 3 : 2,
    readingThinkingWritingLevel: index === 2 ? 1 : 2,
    activityResult: index === 2 ? ('pending' as const) : ('pass' as const),
    scores: Object.fromEntries(
      ['work', 'quiz', 'midterm', 'final', 'other'].map((id, scoreIndex) => [
        id,
        { score: (values as number[])[scoreIndex], status: 'submitted' as const },
      ])
    ),
  })),
};

const SAMPLE_PP5_SUBMISSION: GradeReviewSubmission = {
  id: 'sample',
  status: 'approved',
  submitted_at: '2026-05-01T09:00:00.000Z',
  reviewed_at: '2026-05-02T09:00:00.000Z',
  approved_at: '2026-05-03T09:00:00.000Z',
  note: null,
  submitted_by: { first_name: 'ครู', last_name: 'ตัวอย่าง' },
  reviewed_by: { first_name: 'หัวหน้าวิชาการ', last_name: 'ตัวอย่าง' },
  approved_by: { first_name: 'ผู้อำนวยการ', last_name: 'ตัวอย่าง' },
};

function ExampleDocument({
  template,
  schoolName,
  documentPrefix,
}: {
  template: SchoolDocumentTemplate;
  schoolName?: string;
  documentPrefix?: string;
}) {
  if (template.slug === 'memo')
    return <MemoExampleDocument schoolName={schoolName} documentPrefix={documentPrefix} />;
  const landscape = template.paper === 'A4 แนวนอน';
  return (
    <Document title={`ตัวอย่าง-${template.code}-${template.name}`}>
      <Page size="A4" orientation={landscape ? 'landscape' : 'portrait'} style={styles.page}>
        <Text style={styles.sample}>ตัวอย่างเอกสาร — ข้อมูลสมมติสำหรับดูรูปแบบ</Text>
        <Text style={styles.title}>
          {template.code} {template.name}
        </Text>
        <Text style={styles.school}>โรงเรียนตัวอย่าง สำนักงานเขตพื้นที่การศึกษาตัวอย่าง</Text>
        <View style={styles.meta}>
          <Text>เลขที่เอกสาร DOC-2569-0001</Text>
          <Text>ปีการศึกษา 2569</Text>
          <Text>วันที่ออกเอกสาร 1 พฤษภาคม 2569</Text>
        </View>
        {template.sections.map((section, index) => (
          <View key={section} style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {index + 1}. {section}
            </Text>
            <View style={styles.lines}>
              <Text style={styles.line}>
                ข้อมูลตัวอย่าง
                ................................................................................................
              </Text>
              <Text style={styles.line}>
                รายละเอียด
                .......................................................................................................
              </Text>
              {index === 1 && (
                <Text style={styles.line}>
                  ข้อมูลเพิ่มเติม
                  ...................................................................................................
                </Text>
              )}
            </View>
          </View>
        ))}
        <View style={styles.signatures} wrap={false}>
          <Text style={styles.signature}>
            ลงชื่อ ........................................................{'\n'}
            (ผู้จัดทำเอกสาร){'\n'}เจ้าหน้าที่งานทะเบียน
          </Text>
          <Text style={styles.signature}>
            ลงชื่อ ........................................................{'\n'}
            (ผู้รับรองเอกสาร){'\n'}ผู้อำนวยการโรงเรียน
          </Text>
        </View>
      </Page>
    </Document>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  template: SchoolDocumentTemplate;
};

function A4PreviewPage({
  pageNumber,
  availableWidth,
}: {
  pageNumber: number;
  availableWidth: number;
}) {
  const [paperWidth, setPaperWidth] = useState((210 / 25.4) * 96);

  return (
    <PdfPage
      pageNumber={pageNumber}
      width={Math.min(availableWidth, paperWidth)}
      onLoadSuccess={(page) => {
        // PDF points use 72 units/inch; CSS uses 96 pixels/inch.
        // Read each page separately to preserve mixed portrait/landscape PDFs.
        setPaperWidth(page.getViewport({ scale: 96 / 72 }).width);
      }}
      renderTextLayer={false}
      renderAnnotationLayer={false}
    />
  );
}

function AllPdfPages({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={containerRef} sx={{ width: 1 }}>
      <PdfPages
        file={url}
        loading={<Typography role="status">กำลังโหลดเอกสาร…</Typography>}
        error={<Typography role="alert">ไม่สามารถแสดงเอกสารได้ กรุณาลองใหม่</Typography>}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
      >
        {width > 0 &&
          Array.from({ length: pageCount }, (_, index) => (
            <Box
              key={index + 1}
              aria-label={`หน้า ${index + 1} จาก ${pageCount}`}
              sx={{
                mb: 3,
                mx: 'auto',
                width: 'fit-content',
                maxWidth: 1,
                bgcolor: 'common.white',
                '& canvas': { display: 'block', maxWidth: '100%', height: 'auto !important' },
              }}
            >
              <A4PreviewPage pageNumber={index + 1} availableWidth={width} />
            </Box>
          ))}
      </PdfPages>
    </Box>
  );
}

function DocumentPages({
  document,
}: {
  document: React.ReactElement<React.ComponentProps<typeof Document>>;
}) {
  return (
    <BlobProvider document={document}>
      {({ url, loading, error }) => {
        if (loading) return <Typography role="status">กำลังสร้างเอกสาร…</Typography>;
        if (error || !url)
          return <Typography role="alert">ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่</Typography>;
        return <AllPdfPages key={url} url={url} />;
      }}
    </BlobProvider>
  );
}

function useDocumentSchool(template: SchoolDocumentTemplate) {
  const { user } = useAuthContext();
  const school = useQuery({
    queryKey: ['school', user?.school_id],
    queryFn: () => getSchool(user!.school_id!),
    enabled: template.slug === 'memo' && Boolean(user?.school_id),
  });
  return {
    schoolName: school.data?.name,
    documentPrefix: school.data?.document_prefix || undefined,
  };
}

export function DocumentExamplePreview({ template }: { template: SchoolDocumentTemplate }) {
  const theme = useTheme();
  const school = useDocumentSchool(template);

  const document =
    template.slug === 'pp5' ? (
      <GradeResultDocument report={SAMPLE_PP5_REPORT} submission={SAMPLE_PP5_SUBMISSION} />
    ) : (
      <ExampleDocument template={template} {...school} />
    );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, borderRadius: 2.5, bgcolor: theme.palette.primary.lighter }}>
      <Box
        sx={{
          mb: 2,
          gap: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="body2" sx={{ color: '#243D33' }}>
          {template.paper} · {template.code} · ตัวอย่างเอกสาร
        </Typography>
        <PDFDownloadLink
          document={document}
          fileName={`ตัวอย่าง-${template.code}-${template.name}.pdf`}
          style={{ textDecoration: 'none' }}
        >
          {({ loading, error }) => (
            <Button
              variant="outlined"
              loading={loading}
              disabled={Boolean(error)}
              startIcon={<RemixIcon icon="solar:download-minimalistic-bold" />}
              sx={{ color: '#006B42', borderColor: '#78A992' }}
            >
              {error ? 'สร้าง PDF ไม่สำเร็จ' : 'บันทึก PDF'}
            </Button>
          )}
        </PDFDownloadLink>
      </Box>
      <Box
        sx={{
          mx: 'auto',
          width: 1,
          maxWidth: '210mm',
          borderRadius: 2,
        }}
      >
        <DocumentPages document={document} />
      </Box>
    </Box>
  );
}

export default function DocumentExamplePdfDialog({ open, onClose, template }: Props) {
  const school = useDocumentSchool(template);
  const document =
    template.slug === 'pp5' ? (
      <GradeResultDocument report={SAMPLE_PP5_REPORT} submission={SAMPLE_PP5_SUBMISSION} />
    ) : (
      <ExampleDocument template={template} {...school} />
    );
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>
        ตัวอย่าง PDF · {template.code} {template.name}
        <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          {template.paper}
        </Typography>
      </DialogTitle>
      <DialogContent
        sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: 'background.neutral' }}
      >
        <Box
          sx={{
            width: 1,
            maxWidth: '210mm',
          }}
        >
          <DocumentPages document={document} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          ปิด
        </Button>
        <PDFDownloadLink
          document={document}
          fileName={`ตัวอย่าง-${template.code}-${template.name}.pdf`}
          style={{ textDecoration: 'none' }}
        >
          {({ loading }) => (
            <Button
              variant="contained"
              loading={loading}
              startIcon={<RemixIcon icon="solar:download-minimalistic-bold" />}
            >
              ดาวน์โหลดตัวอย่าง
            </Button>
          )}
        </PDFDownloadLink>
      </DialogActions>
    </Dialog>
  );
}
