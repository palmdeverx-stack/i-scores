'use client';

import type { LessonPlanInput, LessonPlanAssignment } from '../lesson-plan-actions';

import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  Font,
  Page,
  Text,
  View,
  usePDF,
  Document,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { RemixIcon } from 'src/components/remix-icon';

import {
  parseAssessment,
  parseIndicators,
  richTextToPlainText,
} from '../lesson-plan-content';

// ----------------------------------------------------------------------

Font.register({
  family: 'LINE Seed Sans TH',
  fonts: [
    { src: '/fonts/LINESeedSansTH-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/LINESeedSansTH-Bold.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 38,
    paddingHorizontal: 38,
    fontSize: 9,
    lineHeight: 1.45,
    color: '#172B4D',
    fontFamily: 'LINE Seed Sans TH',
  },
  title: { fontSize: 11, fontWeight: 700, textAlign: 'center' },
  planTitle: { marginTop: 2, fontSize: 10, fontWeight: 700, textAlign: 'center' },
  meta: {
    marginTop: 8,
    paddingBottom: 8,
    gap: 3,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottom: '1 dashed #637381',
  },
  metaItem: { width: '50%', display: 'flex', flexDirection: 'row' },
  metaLabel: { width: 88, fontSize: 9, fontWeight: 700 },
  metaValue: { flex: 1, fontSize: 9 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 700 },
  subsection: { marginTop: 5, fontSize: 9, fontWeight: 700 },
  content: { marginTop: 3 },
  indicatorList: { marginTop: 3, gap: 3 },
  indicatorRow: { display: 'flex', flexDirection: 'row' },
  indicatorCode: { width: 92, paddingRight: 8 },
  indicatorText: { flex: 1 },
  muted: { marginTop: 4, color: '#919EAB' },
  table: { marginTop: 8, borderTop: '1 solid #919EAB', borderLeft: '1 solid #919EAB' },
  tableRow: { display: 'flex', flexDirection: 'row' },
  tableHeader: { backgroundColor: '#F4F6F8' },
  tableCell: {
    width: '25%',
    padding: 5,
    fontSize: 8,
    borderRight: '1 solid #919EAB',
    borderBottom: '1 solid #919EAB',
  },
  tableCellHeader: { fontWeight: 700, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 38,
    right: 38,
    bottom: 18,
    fontSize: 8,
    textAlign: 'right',
    color: '#919EAB',
  },
});

function content(value?: string | null) {
  return richTextToPlainText(value) || '-';
}

function thaiDate(value?: string | null) {
  if (!value || !dayjs(value).isValid()) return '-';
  const date = dayjs(value);
  return `${date.format('DD/MM')}/${date.year() + 543}`;
}

function LessonPlanDocument({
  plan,
  assignment,
  version,
}: {
  plan: LessonPlanInput;
  assignment?: LessonPlanAssignment;
  version: number;
}) {
  const assessment = parseAssessment(plan.assessment);
  const indicators = parseIndicators(plan.indicators).filter(
    (indicator) => indicator.code || indicator.description
  );
  const subject = assignment?.subject;
  const classroom = assignment?.classroom;

  const remainingSections = [
    {
      number: 4,
      title: 'สมรรถนะสำคัญของผู้เรียน',
      value: plan.learnerCompetencies,
    },
    {
      number: 5,
      title: 'คุณลักษณะอันพึงประสงค์',
      value: plan.desiredCharacteristics,
    },
    {
      number: 6,
      title: 'คำถามหลัก (Big Question)',
      value: plan.guidingQuestions,
    },
    {
      number: 7,
      title: 'กิจกรรมการเรียนรู้',
      value: plan.learningActivities,
    },
    {
      number: 8,
      title: 'สื่อและแหล่งเรียนรู้',
      value: plan.learningMedia,
    },
  ];

  return (
    <Document title={plan.title || 'แผนการสอน'} author="i-Scores">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          แผนการจัดการเรียนรู้รายวิชา {subject?.name ?? '-'} ชั้น
          {classroom ? `${classroom.grade_level ?? ''} ${classroom.name}`.trim() : '-'}
        </Text>
        <Text style={styles.planTitle}>{plan.title || 'แผนการสอนฉบับร่าง'}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>หน่วยการเรียนรู้ที่</Text>
            <Text style={styles.metaValue}>
              {plan.unitNumber} {plan.unitName || '-'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>เรื่อง</Text>
            <Text style={styles.metaValue}>{plan.title || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>รหัสวิชา</Text>
            <Text style={styles.metaValue}>{subject?.code || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>เวลาเรียน</Text>
            <Text style={styles.metaValue}>{plan.durationPeriods} คาบ</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>สอนวันที่</Text>
            <Text style={styles.metaValue}>
              {thaiDate(plan.startDate)}
              {plan.endDate ? ` ถึง ${thaiDate(plan.endDate)}` : ''}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ภาคเรียน / ปีการศึกษา</Text>
            <Text style={styles.metaValue}>
              {assignment?.semester?.name ?? '-'} / {classroom?.academic_year?.year ?? '-'}
            </Text>
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          <Text style={styles.sectionTitle}>1. มาตรฐานการเรียนรู้และตัวชี้วัด</Text>
          <Text style={styles.subsection}>มาตรฐานการเรียนรู้</Text>
          <Text style={styles.content}>{content(plan.learningStandards)}</Text>
          <Text style={styles.subsection}>ตัวชี้วัด</Text>
          {indicators.length ? (
            <View style={styles.indicatorList}>
              {indicators.map((indicator, index) => (
                <View
                  key={`${indicator.code}-${indicator.description}-${index}`}
                  style={styles.indicatorRow}
                  wrap={false}
                >
                  <Text style={styles.indicatorCode}>{indicator.code}</Text>
                  <Text style={styles.indicatorText}>{indicator.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>-</Text>
          )}
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          <Text style={styles.sectionTitle}>2. จุดประสงค์การเรียนรู้</Text>
          <Text style={styles.content}>{content(plan.learningObjectives)}</Text>
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          <Text style={styles.sectionTitle}>3. สาระสำคัญ</Text>
          <Text style={plan.essentialContent ? styles.content : styles.muted}>
            {content(plan.essentialContent)}
          </Text>
        </View>

        {remainingSections.map((section) => (
          <View key={section.number} style={styles.section} minPresenceAhead={70}>
            <Text style={styles.sectionTitle}>
              {section.number}. {section.title}
            </Text>
            <Text style={section.value ? styles.content : styles.muted}>
              {content(section.value)}
            </Text>
          </View>
        ))}

        <View style={styles.section} minPresenceAhead={100}>
          <Text style={styles.sectionTitle}>9. การวัดและประเมินผลการเรียนรู้</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]} wrap={false}>
              {[
                'ประเด็นการประเมิน',
                'วิธีการประเมิน',
                'เครื่องมือการประเมิน',
                'เกณฑ์การประเมิน',
              ].map((label) => (
                <Text key={label} style={[styles.tableCell, styles.tableCellHeader]}>
                  {label}
                </Text>
              ))}
            </View>
            {assessment.map((row, index) => (
              <View key={`${row.issue}-${index}`} style={styles.tableRow} wrap={false}>
                <Text style={styles.tableCell}>{row.issue || '-'}</Text>
                <Text style={styles.tableCell}>{row.method || '-'}</Text>
                <Text style={styles.tableCell}>{row.tool || '-'}</Text>
                <Text style={styles.tableCell}>{row.criteria || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `ฉบับร่าง · เวอร์ชัน ${version} · หน้า ${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export default function LessonPlanPdfDialog({
  open,
  onClose,
  plan,
  assignment,
  version,
}: {
  open: boolean;
  onClose: () => void;
  plan: LessonPlanInput;
  assignment?: LessonPlanAssignment;
  version: number;
}) {
  const document = useMemo(
    () => <LessonPlanDocument plan={plan} assignment={assignment} version={version} />,
    [assignment, plan, version]
  );
  const [pdf] = usePDF({ document });
  const safeTitle = (plan.title || 'แผนการสอน').replace(/[\\/:*?"<>|]/g, '-');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      slotProps={{ paper: { sx: { height: { xs: '100%', md: 'calc(100vh - 32px)' } } } }}
    >
      <DialogTitle>
        พรีวิวแผนการสอน PDF
        <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          A4 แนวตั้ง · เรียงตามข้อ 1–9
        </Typography>
      </DialogTitle>
      <DialogContent
        sx={{
          p: { xs: 1, md: 2 },
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'grey.900',
        }}
      >
        <Box
          sx={{
            width: { xs: 1, md: 'min(100%, calc((100vh - 180px) * 0.7070707))' },
            aspectRatio: '210 / 297',
            overflow: 'hidden',
            bgcolor: 'common.white',
            boxShadow: 24,
          }}
        >
          {pdf.loading ? (
            <Box sx={{ height: 1, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : pdf.url ? (
            <Box
              component="iframe"
              title="พรีวิวแผนการสอน PDF"
              src={`${pdf.url}#view=FitH&zoom=page-width&toolbar=0&navpanes=0`}
              sx={{ width: 1, height: 1, border: 0, display: 'block' }}
            />
          ) : (
            <Box sx={{ height: 1, display: 'grid', placeItems: 'center', color: 'error.main' }}>
              ไม่สามารถสร้างตัวอย่าง PDF ได้
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          ปิด
        </Button>
        <PDFDownloadLink
          document={document}
          fileName={`${safeTitle}.pdf`}
          style={{ textDecoration: 'none' }}
        >
          {({ loading }) => (
            <Button
              variant="contained"
              loading={loading}
              startIcon={<RemixIcon icon="solar:download-minimalistic-bold" />}
            >
              ดาวน์โหลด PDF
            </Button>
          )}
        </PDFDownloadLink>
      </DialogActions>
    </Dialog>
  );
}
