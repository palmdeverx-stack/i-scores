'use client';

import type { LessonPlanInput, LessonPlanAssignment } from '../lesson-plan-actions';
import type { PdfDisplaySettings, LessonPlanTemplateContent } from 'src/features/templates/types';

import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  Font,
  Page,
  Text,
  View,
  Image,
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

import { formatNumerals } from 'src/utils/thai-numerals';

import { RemixIcon } from 'src/components/remix-icon';

import {
  parseAssessment,
  parseIndicators,
  richTextToPlainText,
  parseLearningActivities,
} from '../lesson-plan-content';

// ----------------------------------------------------------------------

Font.register({
  family: 'LINE Seed Sans TH',
  fonts: [
    { src: '/fonts/LINESeedSansTH-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/LINESeedSansTH-Bold.ttf', fontWeight: 700 },
  ],
});

// @react-pdf/renderer's text shaping drops the final character of a run
// whenever SARA AM (ำ, U+0E33) appears mid-word: the font's internal glyph
// substitution expands it into two glyphs (nikhahit + sara aa) and the
// layout engine's glyph-to-string index bookkeeping doesn't account for
// that expansion. Pre-decomposing ำ into its two-codepoint form (ํ + า)
// avoids the substitution entirely, so no glyph expansion — and no drop —
// ever happens.
function decomposeSaraAm(text: string) {
  return text.replace(/ำ/g, 'ํา');
}

// Thai text has no spaces between words. Segment at word boundaries (not
// individual characters) so a long Thai phrase wraps between whole words —
// breaking mid-word makes the wrapped text unreadable.
Font.registerHyphenationCallback((rawWord) => {
  const word = decomposeSaraAm(rawWord);
  try {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      return Array.from(segmenter.segment(word), (part) => part.segment);
    }
  } catch {
    // Fall through to a combining-mark-aware fallback.
  }
  return Array.from(word).reduce<string[]>((clusters, character) => {
    if (/\p{Mark}/u.test(character) && clusters.length) {
      clusters[clusters.length - 1] += character;
    } else {
      clusters.push(character);
    }
    return clusters;
  }, []);
});

function createStyles(settings: PdfDisplaySettings) {
  const contentSize = settings.contentFontSize ?? 9;
  const headingSize = settings.headingFontSize ?? 10;
  const textColor = settings.textColor ?? '#172B4D';

  return StyleSheet.create({
    page: {
      paddingTop: 30,
      paddingBottom: 38,
      paddingHorizontal: 38,
      fontSize: contentSize,
      lineHeight: 1.45,
      color: textColor,
      fontFamily: 'LINE Seed Sans TH',
    },
    logo: { width: 48, height: 48, marginBottom: 4, alignSelf: 'center', objectFit: 'contain' },
    title: { fontSize: headingSize + 1, fontWeight: 700, textAlign: 'center' },
    planTitle: { marginTop: 2, fontSize: headingSize, fontWeight: 700, textAlign: 'center' },
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
    metaLabel: { width: 88, fontSize: contentSize, fontWeight: 700 },
    metaValue: { flex: 1, fontSize: contentSize },
    section: { marginTop: 12 },
    sectionTitle: { fontSize: headingSize, fontWeight: 700 },
    subsection: { marginTop: 5, fontSize: contentSize, fontWeight: 700 },
    content: { marginTop: 3, gap: 2 },
    contentLine: { textIndent: 36 },
    indicatorList: { marginTop: 3, gap: 3 },
    indicatorRow: { display: 'flex', flexDirection: 'row' },
    indicatorCode: { width: 92, paddingRight: 8 },
    indicatorText: { flex: 1 },
    muted: { marginTop: 4, color: '#919EAB' },
    table: { marginTop: 8, borderTop: '1 solid #919EAB', borderLeft: '1 solid #919EAB' },
    tableRow: { display: 'flex', flexDirection: 'row' },
    tableHeader: { backgroundColor: '#EAF2F8' },
    tableCell: {
      width: '25%',
      padding: 5,
      fontSize: Math.max(contentSize - 1, 6),
      borderRight: '1 solid #919EAB',
      borderBottom: '1 solid #919EAB',
    },
    tableCellHeader: { fontWeight: 700, textAlign: 'center' },
    footer: {
      position: 'absolute',
      left: 38,
      right: 38,
      bottom: 18,
      fontSize: Math.max(contentSize - 1, 6),
      textAlign: 'right',
      color: '#919EAB',
    },
  });
}

type Styles = ReturnType<typeof createStyles>;

const LIST_MARKER_PATTERN = /^([-•]|\d+[.)])\s+/;

// Each line renders as its own paragraph (with spacing between them) so
// separate items stay visually distinct — without a numbered marker, which
// forced a fixed-width column that squeezed the text in narrow layouts.
function ContentBlock({ value, styles }: { value?: string | null; styles: Styles }) {
  const text = richTextToPlainText(value);
  if (!text) return <Text style={styles.muted}>-</Text>;

  const lines = text
    .split('\n')
    .map((line) => line.trim().replace(LIST_MARKER_PATTERN, ''))
    .filter(Boolean);

  return (
    <View style={styles.content}>
      {lines.map((line, index) => (
        <Text key={index} style={styles.contentLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function IndicatorList({
  indicators,
  styles,
}: {
  indicators: Array<{ code: string; description: string }>;
  styles: Styles;
}) {
  if (!indicators.length) return <Text style={styles.muted}>-</Text>;
  return (
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
  );
}

function thaiDate(value?: string | null, numeralStyle?: PdfDisplaySettings['numeralStyle']) {
  if (!value || !dayjs(value).isValid()) return '-';
  const date = dayjs(value);
  return formatNumerals(`${date.format('DD/MM')}/${date.year() + 543}`, numeralStyle);
}

// teachingDate may be an ISO string from the date picker, or legacy free
// text typed before it was a date picker — fall back to the raw text when
// it doesn't parse as a date.
function formatTeachingDate(
  value?: string | null,
  numeralStyle?: PdfDisplaySettings['numeralStyle']
) {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid()
    ? formatNumerals(`${date.format('DD/MM')}/${date.year() + 543}`, numeralStyle)
    : value;
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
  const milestoneIndicators = parseIndicators(plan.milestoneIndicators).filter(
    (indicator) => indicator.code || indicator.description
  );
  const terminalIndicators = parseIndicators(plan.terminalIndicators).filter(
    (indicator) => indicator.code || indicator.description
  );
  const subject = assignment?.subject;
  const classroom = assignment?.classroom;
  const activityRows = parseLearningActivities(plan.learningActivities);
  const cover = (plan.templateSectionContents?.cover ?? {}) as NonNullable<
    LessonPlanTemplateContent['cover']
  >;
  const settings = (plan.templateSectionContents?.pdfSettings ?? {}) as PdfDisplaySettings;
  const styles = createStyles(settings);
  const showHeadings = settings.showHeadings !== false;
  const num = (value: string | number) => formatNumerals(value, settings.numeralStyle);
  const sectionHeading = (number: number, title: string) =>
    showHeadings ? (
      <Text style={styles.sectionTitle}>
        {num(number)}. {title}
      </Text>
    ) : null;

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
  ];
  const mediaSection = {
    number: 8,
    title: 'สื่อและแหล่งเรียนรู้',
    value: plan.learningMedia,
  };

  return (
    <Document title={plan.title || 'แผนการสอน'} author="i-Scores">
      <Page size="A4" style={styles.page}>
        {cover.logoUrl ? <Image src={cover.logoUrl} style={styles.logo} /> : null}
        <Text style={styles.title}>
          แผนการจัดการเรียนรู้รายวิชา {subject?.name ?? '-'} ชั้น
          {classroom ? `${classroom.grade_level ?? ''} ${classroom.name}`.trim() : '-'}
        </Text>
        <Text style={styles.planTitle}>{plan.title || 'แผนการสอนฉบับร่าง'}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>หน่วยการเรียนรู้ที่</Text>
            <Text style={styles.metaValue}>
              {num(plan.unitNumber)} {plan.unitName || '-'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>เรื่อง</Text>
            <Text style={styles.metaValue}>{cover.topic || plan.title || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>รหัสวิชา</Text>
            <Text style={styles.metaValue}>{cover.subjectCode || subject?.code || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ผู้สอน</Text>
            <Text style={styles.metaValue}>{cover.teacherName || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ระดับชั้น</Text>
            <Text style={styles.metaValue}>
              {cover.gradeLevel || classroom?.grade_level || '-'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>เวลาเรียน</Text>
            <Text style={styles.metaValue}>{num(plan.durationPeriods)} คาบ</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>เวลา (ชั่วโมง)</Text>
            <Text style={styles.metaValue}>
              {cover.durationHours ? `${num(cover.durationHours)} ชั่วโมง` : '-'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>สอนวันที่</Text>
            <Text style={styles.metaValue}>
              {cover.teachingDate
                ? formatTeachingDate(cover.teachingDate, settings.numeralStyle)
                : thaiDate(plan.startDate, settings.numeralStyle)}
              {!cover.teachingDate && plan.endDate
                ? ` ถึง ${thaiDate(plan.endDate, settings.numeralStyle)}`
                : ''}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ภาคเรียน / ปีการศึกษา</Text>
            <Text style={styles.metaValue}>
              {cover.semester || assignment?.semester?.name || '-'} /{' '}
              {cover.academicYear || classroom?.academic_year?.year || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          {sectionHeading(1, 'มาตรฐานการเรียนรู้และตัวชี้วัด')}
          <Text style={styles.subsection}>มาตรฐานการเรียนรู้</Text>
          <ContentBlock value={plan.learningStandards} styles={styles} />
          <Text style={styles.subsection}>ตัวชี้วัดระหว่างทาง</Text>
          <IndicatorList indicators={milestoneIndicators} styles={styles} />
          <Text style={styles.subsection}>ตัวชี้วัดปลายทาง</Text>
          <IndicatorList indicators={terminalIndicators} styles={styles} />
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          {sectionHeading(2, 'จุดประสงค์การเรียนรู้')}
          <ContentBlock value={plan.learningObjectives} styles={styles} />
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          {sectionHeading(3, 'สาระสำคัญ')}
          <ContentBlock value={plan.essentialContent} styles={styles} />
        </View>

        {remainingSections.map((section) => (
          <View key={section.number} style={styles.section} minPresenceAhead={70}>
            {sectionHeading(section.number, section.title)}
            <ContentBlock value={section.value} styles={styles} />
          </View>
        ))}

        <View style={styles.section} minPresenceAhead={70}>
          {sectionHeading(7, 'กิจกรรมการเรียนรู้')}
          {activityRows.length ? (
            activityRows.map((row, index) => (
              <View key={index} wrap={false}>
                <Text style={styles.subsection}>{row.title || `กิจกรรมที่ ${index + 1}`}</Text>
                <ContentBlock value={row.description} styles={styles} />
              </View>
            ))
          ) : (
            <Text style={styles.muted}>-</Text>
          )}
        </View>

        <View style={styles.section} minPresenceAhead={70}>
          {sectionHeading(mediaSection.number, mediaSection.title)}
          <ContentBlock value={mediaSection.value} styles={styles} />
        </View>

        <View style={styles.section} minPresenceAhead={100}>
          {sectionHeading(9, 'การวัดและประเมินผลการเรียนรู้')}
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
            `ฉบับร่าง · เวอร์ชัน ${version} · หน้า ${num(pageNumber)} / ${num(totalPages)}`
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
