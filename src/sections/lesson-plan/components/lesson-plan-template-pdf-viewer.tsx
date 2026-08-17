'use client';

import type {
  TemplateType,
  LessonTemplate,
  AssessmentContent,
  PdfDisplaySettings,
  ObjectiveAssessmentRow,
  LearningObjectiveContent,
  LessonPlanTemplateContent,
  LessonPlanTemplateDocument,
  BehaviorObservationContent,
  CompetencyAssessmentContent,
  WorksheetAssessmentRecordContent,
  DesiredCharacteristicAssessmentContent,
} from 'src/features/templates/types';

import dayjs from 'dayjs';
import { Page, pdfjs, Document } from 'react-pdf';
import { useRef, useMemo, useState, useEffect } from 'react';
import {
  Font,
  StyleSheet,
  pdf as createPdf,
  Page as RendererPage,
  Text as RendererText,
  View as RendererView,
  Image as RendererImage,
  Document as RendererDocument,
} from '@react-pdf/renderer';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';

import { formatNumerals } from 'src/utils/thai-numerals';

import { mapObjectivesToAssessmentRows } from 'src/features/templates/assessment-mapping';

import { richTextToPlainText, parseLearningActivities } from '../lesson-plan-content';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 700 },
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
  const contentSize = settings.contentFontSize ?? 10;
  const headingSize = settings.headingFontSize ?? 12;
  const textColor = settings.textColor ?? '#172B4D';

  return StyleSheet.create({
    page: {
      paddingTop: 42,
      paddingBottom: 48,
      paddingHorizontal: 48,
      fontSize: contentSize,
      lineHeight: 1.55,
      color: textColor,
      fontFamily: 'Sarabun',
    },
    overline: { fontSize: 8, color: '#637381', textAlign: 'center' },
    title: { marginTop: 6, fontSize: headingSize + 6, fontWeight: 700, textAlign: 'center' },
    description: { marginTop: 8, color: '#637381', textAlign: 'center' },
    coverHeading: { fontSize: headingSize + 2, fontWeight: 700, textAlign: 'center' },
    coverLogo: {
      width: 72,
      height: 72,
      marginBottom: 10,
      objectFit: 'contain',
      alignSelf: 'center',
    },
    coverColumns: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    coverLeft: { width: '68%', paddingRight: 12 },
    coverRight: { width: '32%' },
    coverLine: { marginBottom: 4, fontSize: contentSize, fontWeight: 700 },
    coverDivider: { marginTop: 12, borderBottom: '1 solid #172B4D' },
    meta: {
      marginTop: 22,
      paddingVertical: 10,
      display: 'flex',
      flexDirection: 'row',
      borderTop: '1 solid #DFE3E8',
      borderBottom: '1 solid #DFE3E8',
    },
    metaItem: { width: '33.333%' },
    metaLabel: { fontSize: Math.max(contentSize - 2, 6), color: '#919EAB' },
    metaValue: { marginTop: 2, fontSize: contentSize - 1 },
    section: { marginTop: 18 },
    sectionTitle: { fontSize: headingSize, fontWeight: 700 },
    sectionContent: { marginTop: 8, paddingLeft: 16 },
    subsection: { marginTop: 10, fontSize: headingSize - 2, fontWeight: 700 },
    paragraph: { marginBottom: 5, textIndent: 36 },
    missing: { color: '#919EAB' },
    assessmentTable: {
      marginTop: 8,
      borderTop: '0.5 solid #919EAB',
      borderLeft: '0.5 solid #919EAB',
    },
    assessmentRow: { display: 'flex', flexDirection: 'row' },
    assessmentHeader: { backgroundColor: '#EAF2F8' },
    assessmentCell: {
      width: '25%',
      padding: 5,
      fontSize: Math.max(contentSize - 2, 6),
      borderRight: '0.5 solid #919EAB',
      borderBottom: '0.5 solid #919EAB',
    },
    assessmentCellHeader: { fontWeight: 700, textAlign: 'center' },
    reflectionHeading: { marginTop: 18, fontSize: headingSize - 1, fontWeight: 700 },
    reflectionSubheading: {
      marginTop: 7,
      marginLeft: 18,
      fontSize: headingSize - 2,
      fontWeight: 700,
    },
    reflectionBody: { marginTop: 5, marginLeft: 36 },
    reflectionRow: {
      marginBottom: 5,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    reflectionLabel: { fontSize: contentSize },
    reflectionFill: {
      minWidth: 72,
      marginHorizontal: 4,
      paddingHorizontal: 3,
      fontSize: contentSize,
      textAlign: 'center',
      borderBottomWidth: 0.7,
      borderBottomStyle: 'dotted',
      borderBottomColor: '#172B4D',
    },
    reflectionBlock: { marginTop: 8 },
    reflectionBlockTitle: { marginBottom: 3, fontSize: contentSize },
    reflectionWritingLine: {
      minHeight: 18,
      marginBottom: 4,
      paddingHorizontal: 3,
      fontSize: contentSize - 1,
      borderBottomWidth: 0.7,
      borderBottomStyle: 'dotted',
      borderBottomColor: '#172B4D',
    },
    reflectionSignature: {
      width: 220,
      marginTop: 70,
      marginLeft: 'auto',
      textAlign: 'center',
    },
    reflectionSignatureLine: { marginBottom: 4, fontSize: contentSize },
    worksheetTitle: {
      marginTop: 8,
      fontSize: headingSize + 1,
      fontWeight: 700,
      textAlign: 'center',
    },
    worksheetTopic: { marginTop: 5, marginBottom: 14, fontSize: contentSize, textAlign: 'center' },
    worksheetSectionTitle: {
      marginTop: 16,
      marginBottom: 7,
      fontSize: headingSize - 2,
      fontWeight: 700,
    },
    worksheetTable: { borderTop: '0.5 solid #172B4D', borderLeft: '0.5 solid #172B4D' },
    worksheetRow: { display: 'flex', flexDirection: 'row' },
    worksheetHeader: { backgroundColor: '#EAF2F8' },
    worksheetCell: {
      padding: 4,
      fontSize: Math.max(contentSize - 2.8, 6),
      borderRight: '0.5 solid #172B4D',
      borderBottom: '0.5 solid #172B4D',
    },
    worksheetCellCenter: { textAlign: 'center' },
    worksheetCellHeader: { fontWeight: 700, textAlign: 'center' },
    worksheetNote: { marginTop: 6, fontSize: Math.max(contentSize - 2, 6) },
    worksheetSignature: { width: 230, marginTop: 24, marginLeft: 'auto', textAlign: 'center' },
    worksheetSignatureLine: { marginBottom: 5, fontSize: contentSize - 1 },
  });
}

type Styles = ReturnType<typeof createStyles>;

function asText(value: unknown) {
  return typeof value === 'string' ? richTextToPlainText(value) : '';
}

const LIST_MARKER_PATTERN = /^([-•]|\d+[.)])\s+/;

// Each line renders as its own paragraph, without a numbered marker — a
// fixed-width marker column squeezes the text in narrow layouts.
function ParagraphLine({ line, styles: pageStyles }: { line: string; styles: Styles }) {
  return (
    <RendererText style={pageStyles.paragraph}>
      {line.replace(LIST_MARKER_PATTERN, '')}
    </RendererText>
  );
}

function structuredContentLines(content: Record<string, unknown>) {
  const source = (content.items ?? content.standards ?? content.competencies ?? []) as unknown;
  if (!Array.isArray(source)) return [];

  return source
    .map((item, index) => {
      if (typeof item === 'string' || typeof item === 'number')
        return `${index + 1}. ${String(item)}`;
      const row = (item ?? {}) as Record<string, unknown>;
      const code = asText(row.code);
      const title = asText(row.title ?? row.name);
      const description = asText(row.description ?? row.detail);
      const heading = [code, title || (!code ? description : '')].filter(Boolean).join(' — ');
      const detail = title || code ? description : '';
      return heading ? `${index + 1}. ${heading}${detail ? `\n${detail}` : ''}` : '';
    })
    .filter(Boolean);
}

function hasMeaningfulTemplateContent(type: TemplateType, content: Record<string, unknown>) {
  if (type === 'learning_standard')
    return (
      structuredContentLines(content).length > 0 ||
      structuredContentLines({ items: content.milestoneIndicators }).length > 0 ||
      structuredContentLines({ items: content.terminalIndicators }).length > 0
    );
  if (
    ['competency', 'desired_characteristic', 'learner_development', 'learning_task'].includes(type)
  )
    return structuredContentLines(content).length > 0;
  if (type === 'learning_objective') {
    const items = (content.objectives as Array<Record<string, unknown>> | undefined) ?? [content];
    return items.some((item) =>
      [item.description, item.behaviorVerb, item.condition, item.expectedResult].some(
        (value) => typeof value === 'string' && value.trim()
      )
    );
  }
  if (type === 'essential_content')
    return Boolean(asText(content.content)) || Boolean((content.keyConcepts as unknown[])?.length);
  if (type === 'learning_content') return Boolean((content.topics as unknown[])?.length);
  if (type === 'learning_activity') {
    const items =
      (content.items as Array<{ title?: string; description?: string }> | undefined) ?? [];
    return items.some((item) => Boolean(item.title?.trim()) || Boolean(asText(item.description)));
  }
  if (type === 'assessment')
    return (
      ((content.rows as unknown[])?.length ?? 0) > 0 ||
      [content.method, content.instrument, content.evidence, content.criteria].some(
        (value) => typeof value === 'string' && value.trim()
      )
    );
  if (type === 'rubric')
    return ((content.criteria as Array<Record<string, unknown>> | undefined) ?? []).some(
      (item) => typeof item.name === 'string' && item.name.trim()
    );
  if (type === 'media') {
    const items = (content.items as Array<Record<string, unknown>> | undefined) ?? [content];
    return items.some((item) => typeof item.title === 'string' && item.title.trim());
  }
  if (type === 'question')
    return ((content.questions as Array<Record<string, unknown>> | undefined) ?? []).some(
      (item) => typeof item.question === 'string' && item.question.trim()
    );
  if (type === 'reflection')
    return (
      ((content.sections as Array<Record<string, unknown>> | undefined) ?? []).some(
        (item) => typeof item.title === 'string' && item.title.trim()
      ) ||
      [
        content.studentCount,
        content.passedCount,
        content.passedPercentage,
        content.notPassedCount,
        content.notPassedPercentage,
        content.knowledgeResult,
        content.processResult,
        content.attitudeResult,
        content.problems,
        content.solutions,
      ].some((value) => value !== undefined && value !== '') ||
      Boolean((content.specialStudents as unknown[])?.length)
    );
  if (type === 'worksheet_assessment_record')
    return (
      Boolean(asText(content.topic)) ||
      Boolean(asText(content.evaluatorName)) ||
      ((content.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        Boolean(asText(student.name))
      )
    );
  if (type === 'desired_characteristic_assessment')
    return (
      Boolean(asText(content.evaluatorName)) ||
      ((content.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        Boolean(asText(student.name))
      )
    );
  if (type === 'competency_assessment')
    return (
      Boolean(asText(content.evaluatorName)) ||
      ((content.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        Boolean(asText(student.name))
      )
    );
  if (type === 'behavior_observation')
    return (
      Boolean(asText(content.evaluatorName)) ||
      ((content.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        Boolean(asText(student.name))
      )
    );
  return false;
}

function templateContentLines(type: TemplateType, content: Record<string, unknown>) {
  if (
    [
      'learning_standard',
      'competency',
      'desired_characteristic',
      'learner_development',
      'learning_task',
    ].includes(type)
  ) {
    return structuredContentLines(content);
  }
  if (type === 'learning_objective') {
    const objectives = (content.objectives as Array<Record<string, unknown>> | undefined) ?? [
      content,
    ];
    return objectives.flatMap((objective, index) => {
      const statement =
        [objective.condition, objective.behaviorVerb, objective.expectedResult]
          .filter(Boolean)
          .map(String)
          .join(' ') || asText(objective.description);

      return [
        `${index + 1}. ${statement}`,
        objective.domain
          ? `ด้าน: ${
              {
                knowledge: 'ความรู้ (K)',
                process: 'ทักษะ/กระบวนการ (P)',
                attitude: 'เจตคติ (A)',
              }[String(objective.domain)] ?? String(objective.domain)
            }`
          : '',
        objective.behaviorVerb ? `คำกริยาพฤติกรรม: ${String(objective.behaviorVerb)}` : '',
        objective.condition ? `เงื่อนไข: ${String(objective.condition)}` : '',
        objective.expectedResult ? `ผลลัพธ์ที่คาดหวัง: ${String(objective.expectedResult)}` : '',
        objective.successCriteria ? `เกณฑ์ความสำเร็จ: ${String(objective.successCriteria)}` : '',
      ].filter(Boolean);
    });
  }
  if (type === 'essential_content')
    return [
      asText(content.content),
      ...((content.keyConcepts ?? []) as string[]).map((item) => `• ${item}`),
    ].filter(Boolean);
  if (type === 'learning_content')
    return ((content.topics ?? []) as Array<{ title: string; description?: string }>).map(
      (item, index) =>
        `${index + 1}. ${item.title}${item.description ? `\n${item.description}` : ''}`
    );
  if (type === 'learning_activity') {
    const items =
      (content.items as Array<{ title?: string; description?: string }> | undefined) ?? [];
    return items.flatMap((item, index) => {
      const description = asText(item.description);
      return [
        `${index + 1}. ${item.title?.trim() || `กิจกรรมที่ ${index + 1}`}`,
        ...(description ? [description] : []),
      ];
    });
  }
  if (type === 'assessment')
    return [
      `วิธีการประเมิน: ${asText(content.method) || '-'}`,
      `เครื่องมือ: ${asText(content.instrument) || '-'}`,
      `หลักฐาน: ${asText(content.evidence) || '-'}`,
      `เกณฑ์: ${asText(content.criteria) || '-'}`,
    ];
  if (type === 'rubric')
    return (
      (content.criteria ?? []) as Array<{
        name: string;
        description?: string;
        weight?: number;
        levels?: Array<{ label: string; score: number; description: string }>;
      }>
    ).map(
      (criterion, index) =>
        `${index + 1}. ${criterion.name}${criterion.weight ? ` (${criterion.weight}%)` : ''}${criterion.description ? `\n${criterion.description}` : ''}${criterion.levels?.length ? `\n${criterion.levels.map((level) => `${level.label} ${level.score}: ${level.description}`).join(' | ')}` : ''}`
    );
  if (type === 'media') {
    const items = (content.items as Array<Record<string, unknown>> | undefined) ?? [content];
    return items.flatMap((item, index) =>
      [
        `${index + 1}. ${asText(item.title)}`,
        asText(item.description),
        item.usageInstructions ? `วิธีใช้: ${asText(item.usageInstructions)}` : '',
        asText(item.url),
      ].filter(Boolean)
    );
  }
  if (type === 'question')
    return (
      (content.questions ?? []) as Array<{
        question: string;
        expectedAnswer?: string;
        followUpQuestions?: string[];
      }>
    ).map(
      (question, index) =>
        `${index + 1}. ${question.question}${question.expectedAnswer ? `\nแนวคำตอบ: ${question.expectedAnswer}` : ''}${question.followUpQuestions?.length ? `\nคำถามต่อยอด: ${question.followUpQuestions.join(' · ')}` : ''}`
    );
  if (type === 'reflection')
    return [
      '๑. ผลการจัดการเรียนรู้',
      `นักเรียนจำนวน ${content.studentCount ?? '....................'} คน`,
      `ผ่านจุดประสงค์การเรียนรู้ ${content.passedCount ?? '....................'} คน  คิดเป็นร้อยละ ${content.passedPercentage ?? '................'}`,
      `ไม่ผ่านจุดประสงค์การเรียนรู้ ${content.notPassedCount ?? '....................'} คน  คิดเป็นร้อยละ ${content.notPassedPercentage ?? '................'}`,
      `นักเรียนที่มีความสามารถพิเศษ/นักเรียนเด็กพิเศษ ได้แก่\n${((content.specialStudents ?? []) as string[]).join('\n') || '................................................................................'}`,
      `ผลการจัดการเรียนรู้ด้านความรู้ (K)\n${asText(content.knowledgeResult) || '................................................................................'}`,
      `ผลการจัดการเรียนรู้ด้านทักษะ/กระบวนการ (P)\n${asText(content.processResult) || '................................................................................'}`,
      `ผลการจัดการเรียนรู้ด้านคุณลักษณะ (A)\n${asText(content.attitudeResult) || '................................................................................'}`,
      `๒. ปัญหา/อุปสรรค\n${asText(content.problems) || '................................................................................'}`,
      `๓. แนวทางแก้ไข/ข้อเสนอแนะ\n${asText(content.solutions) || '................................................................................'}`,
      ...((content.sections ?? []) as Array<{ title: string; placeholder?: string }>).map(
        (section) =>
          `${section.title}\n${section.placeholder || '................................................................................'}`
      ),
    ];
  if (type === 'worksheet_assessment_record') return [];
  if (type === 'desired_characteristic_assessment') return [];
  if (type === 'competency_assessment') return [];
  if (type === 'behavior_observation') return [];
  return Object.values(content).flatMap((value) =>
    typeof value === 'string' && value ? [asText(value)] : []
  );
}

function templateDocumentSections(document: LessonPlanTemplateDocument) {
  const plainLines = (value: string) => {
    const text = asText(value);
    return text ? text.split('\n').filter(Boolean) : [];
  };
  const assessmentRows: ObjectiveAssessmentRow[] = document.assessment.startsWith(
    'ASSESSMENT_TABLE_V1:'
  )
    ? (() => {
        try {
          const rows = JSON.parse(
            document.assessment.slice('ASSESSMENT_TABLE_V1:'.length)
          ) as Array<{ issue?: string; method?: string; tool?: string; criteria?: string }>;
          return rows.map((row, index) => ({
            objectiveId: `document-objective-${index}`,
            issue: row.issue ?? '',
            method: row.method ?? '',
            instrument: row.tool ?? '',
            criteria: row.criteria ?? '',
          }));
        } catch {
          return [];
        }
      })()
    : [];

  const sections = [
    {
      id: 'lesson-plan-standards',
      title: 'มาตรฐานการเรียนรู้และตัวชี้วัด',
      type: 'learning_standard' as const,
      lines: [],
      subsections: [
        { title: 'มาตรฐานการเรียนรู้', lines: plainLines(document.learningStandards) },
        { title: 'ตัวชี้วัดระหว่างทาง', lines: plainLines(document.milestoneIndicators) },
        { title: 'ตัวชี้วัดปลายทาง', lines: plainLines(document.terminalIndicators) },
      ],
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-objectives',
      title: 'จุดประสงค์การเรียนรู้',
      type: 'learning_objective' as const,
      lines: plainLines(document.learningObjectives),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-essential',
      title: 'สาระสำคัญ',
      type: 'essential_content' as const,
      lines: plainLines(document.essentialContent),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-competencies',
      title: 'สมรรถนะสำคัญของผู้เรียน',
      type: 'competency' as const,
      lines: plainLines(document.learnerCompetencies),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-characteristics',
      title: 'คุณลักษณะอันพึงประสงค์',
      type: 'desired_characteristic' as const,
      lines: plainLines(document.desiredCharacteristics),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-questions',
      title: 'คำถามกระตุ้นการคิด',
      type: 'question' as const,
      lines: plainLines(document.guidingQuestions),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-activities',
      title: 'กิจกรรมการเรียนรู้',
      type: 'learning_activity' as const,
      lines: [],
      subsections: parseLearningActivities(document.learningActivities).map((row, index) => ({
        title: row.title || `กิจกรรมที่ ${index + 1}`,
        lines: plainLines(row.description),
      })),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-media',
      title: 'สื่อและแหล่งเรียนรู้',
      type: 'media' as const,
      lines: plainLines(document.learningMedia),
      assessmentRows: undefined,
    },
    {
      id: 'lesson-plan-assessment',
      title: 'การวัดและประเมินผล',
      type: 'assessment' as const,
      lines: assessmentRows.length ? [] : plainLines(document.assessment),
      assessmentRows,
    },
  ];
  const order = document.sectionOrder ?? [];
  return sections.toSorted((left, right) => {
    const leftIndex = order.indexOf(left.id);
    const rightIndex = order.indexOf(right.id);
    return (
      (leftIndex < 0 ? sections.length : leftIndex) -
      (rightIndex < 0 ? sections.length : rightIndex)
    );
  });
}

function BehaviorObservationPage({
  observation,
  styles: pageStyles,
}: {
  observation: BehaviorObservationContent;
  styles: Styles;
}) {
  const behaviors = observation.behaviors ?? [];
  const behaviorWidth = behaviors.length ? 52 / behaviors.length : 52;

  return (
    <RendererPage size="A4" style={pageStyles.page} wrap>
      <RendererText style={pageStyles.worksheetTitle}>
        {observation.title || 'แบบสังเกตพฤติกรรม'}
      </RendererText>
      <RendererText style={[pageStyles.worksheetNote, { marginBottom: 10 }]}>
        คำชี้แจง : {observation.instructions || '-'}
      </RendererText>

      <RendererView style={pageStyles.worksheetTable}>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '8%' }]}
          >
            ลำดับที่
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '30%' }]}
          >
            ชื่อ-สกุล
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '52%' }]}
          >
            รายการประเมิน
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '10%' }]}
          >
            สรุปผลการประเมิน
          </RendererText>
        </RendererView>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText style={[pageStyles.worksheetCell, { width: '38%' }]} />
          {behaviors.map((behavior) => (
            <RendererText
              key={behavior.id}
              style={[
                pageStyles.worksheetCell,
                pageStyles.worksheetCellHeader,
                { width: `${behaviorWidth}%` },
              ]}
            >
              {behavior.title || '-'}
            </RendererText>
          ))}
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '5%' }]}
          >
            ผ่าน
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '5%' }]}
          >
            ไม่ผ่าน
          </RendererText>
        </RendererView>
        {(observation.students ?? []).map((student, studentIndex) => {
          const observations = behaviors.map((_, behaviorIndex) =>
            Boolean(student.observations?.[behaviorIndex])
          );
          const observedCount = observations.filter(Boolean).length;
          const hasAssessment = Boolean(student.name?.trim()) || observedCount > 0;
          const passed = observedCount >= Number(observation.passingMinimum || 0);
          return (
            <RendererView
              key={student.id || studentIndex}
              style={pageStyles.worksheetRow}
              wrap={false}
            >
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '8%' }]}
              >
                {studentIndex + 1}
              </RendererText>
              <RendererText style={[pageStyles.worksheetCell, { width: '30%' }]}>
                {student.name || '-'}
              </RendererText>
              {observations.map((observed, behaviorIndex) => (
                <RendererText
                  key={`${student.id || studentIndex}-${behaviors[behaviorIndex]?.id || behaviorIndex}`}
                  style={[
                    pageStyles.worksheetCell,
                    pageStyles.worksheetCellCenter,
                    { width: `${behaviorWidth}%` },
                  ]}
                >
                  {observed ? '✓' : '-'}
                </RendererText>
              ))}
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '5%' }]}
              >
                {hasAssessment && passed ? '✓' : ''}
              </RendererText>
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '5%' }]}
              >
                {hasAssessment && !passed ? '✓' : ''}
              </RendererText>
            </RendererView>
          );
        })}
      </RendererView>

      <RendererText style={pageStyles.worksheetSectionTitle}>เกณฑ์การประเมิน</RendererText>
      <RendererText style={pageStyles.worksheetNote}>
        {observation.passingNote ||
          `พบพฤติกรรมตั้งแต่ ${observation.passingMinimum ?? 0} รายการขึ้นไป หมายถึง ผ่าน`}
      </RendererText>

      <RendererView style={pageStyles.worksheetSignature} wrap={false}>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          ลงชื่อ................................................
          {observation.evaluatorRole || 'ผู้ประเมิน'}
        </RendererText>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          ( {observation.evaluatorName || '................................................'} )
        </RendererText>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          {observation.evaluationDate || 'วันที่ .......... / .......... / ..........'}
        </RendererText>
      </RendererView>
    </RendererPage>
  );
}

function CompetencyAssessmentPage({
  assessment,
  domain,
  domainIndex,
  styles: pageStyles,
}: {
  assessment: CompetencyAssessmentContent;
  domain: CompetencyAssessmentContent['domains'][number];
  domainIndex: number;
  styles: Styles;
}) {
  const qualityByScore = new Map(
    (assessment.qualityLevels ?? []).map((level) => [Number(level.score), level.label])
  );

  return (
    <RendererPage size="A4" style={pageStyles.page} wrap>
      <RendererText style={pageStyles.worksheetTitle}>
        {assessment.title || 'แบบประเมินสมรรถนะสำคัญของผู้เรียน'}
        {domain.title ? domain.title : ''}
      </RendererText>
      <RendererText style={[pageStyles.worksheetNote, { marginBottom: 10 }]}>
        คำชี้แจง : {assessment.instructions || '-'}
      </RendererText>

      <RendererView style={pageStyles.worksheetTable}>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '8%' }]}
          >
            เลขที่
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '32%' }]}
          >
            ชื่อ-สกุล
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '20%' }]}
          >
            รายการที่สังเกต
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '20%' }]}
          >
            ระดับคุณภาพ
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '20%' }]}
          >
            สรุปผลการประเมิน
          </RendererText>
        </RendererView>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText style={[pageStyles.worksheetCell, { width: '40%' }]} />
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '20%' }]}
          >
            {domain.competencyLabel || domain.title || '-'}
            {`\n`}เต็ม 3 คะแนน
          </RendererText>
          <RendererText style={[pageStyles.worksheetCell, { width: '40%' }]} />
        </RendererView>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText style={[pageStyles.worksheetCell, { width: '40%' }]} />
          {[3, 2, 1, 0].map((score) => (
            <RendererText
              key={`competency-score-${score}`}
              style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '5%' }]}
            >
              {score}
            </RendererText>
          ))}
          <RendererText style={[pageStyles.worksheetCell, { width: '40%' }]} />
        </RendererView>
        {(assessment.students ?? []).map((student, studentIndex) => {
          const score = Number(student.scores?.[domainIndex] || 0);
          const hasAssessment = Boolean(student.name?.trim()) || score > 0;
          return (
            <RendererView
              key={student.id || studentIndex}
              style={pageStyles.worksheetRow}
              wrap={false}
            >
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '8%' }]}
              >
                {studentIndex + 1}
              </RendererText>
              <RendererText style={[pageStyles.worksheetCell, { width: '32%' }]}>
                {student.name || '-'}
              </RendererText>
              {[3, 2, 1, 0].map((rating) => (
                <RendererText
                  key={`${student.id || studentIndex}-${rating}`}
                  style={[
                    pageStyles.worksheetCell,
                    pageStyles.worksheetCellCenter,
                    { width: '5%' },
                  ]}
                >
                  {hasAssessment && score === rating ? '✓' : ''}
                </RendererText>
              ))}
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '20%' }]}
              >
                {hasAssessment ? qualityByScore.get(score) || '-' : '-'}
              </RendererText>
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '20%' }]}
              >
                {hasAssessment
                  ? score >= Number(assessment.passingScore || 0)
                    ? 'ผ่าน'
                    : 'ไม่ผ่าน'
                  : '-'}
              </RendererText>
            </RendererView>
          );
        })}
      </RendererView>

      <RendererText style={pageStyles.worksheetSectionTitle}>เกณฑ์การให้คะแนน</RendererText>
      <RendererView style={{ width: 300 }}>
        {(assessment.qualityLevels ?? [])
          .toSorted((left, right) => right.score - left.score)
          .map((level) => (
            <RendererView key={level.id} style={pageStyles.worksheetRow}>
              <RendererText style={[pageStyles.worksheetNote, { width: '38%' }]}>
                คะแนนรวม {level.score} คะแนน
              </RendererText>
              <RendererText style={[pageStyles.worksheetNote, { width: '62%' }]}>
                ระดับคุณภาพ {level.label}
              </RendererText>
            </RendererView>
          ))}
      </RendererView>
      <RendererText style={pageStyles.worksheetSectionTitle}>เกณฑ์การตัดสิน</RendererText>
      <RendererText style={pageStyles.worksheetNote}>
        {assessment.passingNote ||
          `ได้รับคะแนนตั้งแต่ ${assessment.passingScore ?? 0} คะแนนขึ้นไปถือว่าผ่าน`}
      </RendererText>

      <RendererView style={pageStyles.worksheetSignature} wrap={false}>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          ลงชื่อ................................................
          {assessment.evaluatorRole || 'ผู้ประเมิน'}
        </RendererText>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          ( {assessment.evaluatorName || '................................................'} )
        </RendererText>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          {assessment.evaluationDate || 'วันที่ .......... / .......... / ..........'}
        </RendererText>
      </RendererView>
    </RendererPage>
  );
}

function DesiredCharacteristicAssessmentPage({
  assessment,
  styles: pageStyles,
}: {
  assessment: DesiredCharacteristicAssessmentContent;
  styles: Styles;
}) {
  const groups = assessment.characteristicGroups ?? [];
  const behaviors = groups.flatMap((group) =>
    (group.behaviors ?? []).map((behavior) => ({ group, behavior }))
  );
  const students = assessment.students ?? [];
  const behaviorAreaWidth = 55;
  const behaviorWidth = behaviors.length ? behaviorAreaWidth / behaviors.length : behaviorAreaWidth;
  const ratingWidth = behaviorWidth / 3;

  return (
    <RendererPage size="A4" style={pageStyles.page} wrap>
      <RendererText style={pageStyles.worksheetTitle}>
        {assessment.title || 'แบบประเมินคุณลักษณะอันพึงประสงค์'}
      </RendererText>
      <RendererText style={[pageStyles.worksheetNote, { marginBottom: 10 }]}>
        คำชี้แจง : {assessment.instructions || '-'}
      </RendererText>

      <RendererView style={pageStyles.worksheetTable}>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '5%' }]}
          >
            ลำดับที่
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '22%' }]}
          >
            ชื่อ-สกุล
          </RendererText>
          {groups.map((group) => (
            <RendererText
              key={group.id}
              style={[
                pageStyles.worksheetCell,
                pageStyles.worksheetCellHeader,
                { width: `${(group.behaviors?.length ?? 0) * behaviorWidth}%` },
              ]}
            >
              {group.title || '-'}
            </RendererText>
          ))}
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '8%' }]}
          >
            รวมคะแนน
          </RendererText>
          <RendererText
            style={[pageStyles.worksheetCell, pageStyles.worksheetCellHeader, { width: '10%' }]}
          >
            ผลการประเมิน
          </RendererText>
        </RendererView>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText style={[pageStyles.worksheetCell, { width: '27%' }]} />
          {behaviors.map(({ behavior }) => (
            <RendererText
              key={behavior.id}
              style={[
                pageStyles.worksheetCell,
                pageStyles.worksheetCellHeader,
                { width: `${behaviorWidth}%` },
              ]}
            >
              {behavior.title || '-'}
            </RendererText>
          ))}
          <RendererText style={[pageStyles.worksheetCell, { width: '18%' }]} />
        </RendererView>
        <RendererView style={[pageStyles.worksheetRow, pageStyles.worksheetHeader]} wrap={false}>
          <RendererText style={[pageStyles.worksheetCell, { width: '27%' }]} />
          {behaviors.flatMap(({ behavior }) =>
            [3, 2, 1].map((score) => (
              <RendererText
                key={`${behavior.id}-${score}`}
                style={[
                  pageStyles.worksheetCell,
                  pageStyles.worksheetCellHeader,
                  { width: `${ratingWidth}%` },
                ]}
              >
                {score}
              </RendererText>
            ))
          )}
          <RendererText style={[pageStyles.worksheetCell, { width: '18%' }]} />
        </RendererView>
        {students.map((student, studentIndex) => {
          const scores = behaviors.map((_, index) => Number(student.scores?.[index] || 0));
          const total = scores.reduce((sum, score) => sum + score, 0);
          return (
            <RendererView
              key={student.id || studentIndex}
              style={pageStyles.worksheetRow}
              wrap={false}
            >
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '5%' }]}
              >
                {studentIndex + 1}
              </RendererText>
              <RendererText style={[pageStyles.worksheetCell, { width: '22%' }]}>
                {student.name || '-'}
              </RendererText>
              {scores.flatMap((selectedScore, behaviorIndex) =>
                [3, 2, 1].map((score) => (
                  <RendererText
                    key={`${student.id || studentIndex}-${behaviors[behaviorIndex]?.behavior.id || behaviorIndex}-${score}`}
                    style={[
                      pageStyles.worksheetCell,
                      pageStyles.worksheetCellCenter,
                      { width: `${ratingWidth}%` },
                    ]}
                  >
                    {selectedScore === score ? '✓' : ''}
                  </RendererText>
                ))
              )}
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '8%' }]}
              >
                {total}
              </RendererText>
              <RendererText
                style={[pageStyles.worksheetCell, pageStyles.worksheetCellCenter, { width: '10%' }]}
              >
                {total >= Number(assessment.passingScore || 0) ? 'ผ่าน' : 'ไม่ผ่าน'}
              </RendererText>
            </RendererView>
          );
        })}
      </RendererView>

      <RendererText style={pageStyles.worksheetSectionTitle}>เกณฑ์การประเมิน</RendererText>
      <RendererView style={{ width: 260 }}>
        <RendererView style={pageStyles.worksheetRow}>
          <RendererText style={[pageStyles.worksheetNote, { width: '50%', fontWeight: 700 }]}>
            ช่วงคะแนน
          </RendererText>
          <RendererText style={[pageStyles.worksheetNote, { width: '50%', fontWeight: 700 }]}>
            ระดับคุณภาพ
          </RendererText>
        </RendererView>
        {(assessment.qualityLevels ?? []).map((level) => (
          <RendererView key={level.id} style={pageStyles.worksheetRow}>
            <RendererText style={[pageStyles.worksheetNote, { width: '50%' }]}>
              {level.minimumScore}
              {level.maximumScore === undefined || level.maximumScore === level.minimumScore
                ? ''
                : `–${level.maximumScore}`}{' '}
              คะแนน
            </RendererText>
            <RendererText style={[pageStyles.worksheetNote, { width: '50%' }]}>
              {level.label}
            </RendererText>
          </RendererView>
        ))}
      </RendererView>
      <RendererText style={pageStyles.worksheetNote}>
        หมายเหตุ :{' '}
        {assessment.passingNote || `ผ่านเมื่อได้คะแนนตั้งแต่ ${assessment.passingScore ?? 0} คะแนน`}
      </RendererText>

      <RendererView style={pageStyles.worksheetSignature} wrap={false}>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          ลงชื่อ................................................
          {assessment.evaluatorRole || 'ผู้ประเมิน'}
        </RendererText>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          ( {assessment.evaluatorName || '................................................'} )
        </RendererText>
        <RendererText style={pageStyles.worksheetSignatureLine}>
          {assessment.evaluationDate || 'วันที่ .......... / .......... / ..........'}
        </RendererText>
      </RendererView>
    </RendererPage>
  );
}

function LessonPlanTemplatePdfDocument({
  template,
  sectionTemplates,
}: {
  template: LessonTemplate;
  sectionTemplates: LessonTemplate[];
}) {
  const templateById = new Map(sectionTemplates.map((item) => [item.id, item]));
  const content = template.content as LessonPlanTemplateContent;
  const cover = content.cover ?? {};
  const document = content.document;
  const settings = content.pdfSettings ?? {};
  const docStyles = createStyles(settings);
  const showHeadings = settings.showHeadings !== false;
  const num = (value: string | number) => formatNumerals(value, settings.numeralStyle);
  const displayValue = (value?: string | null) => value?.trim() || '-';
  // teachingDate may be an ISO string from the date picker, or legacy free
  // text typed before it was a date picker — fall back to the raw text when
  // it doesn't parse as a date.
  const displayTeachingDate = (value?: string | null) => {
    if (!value?.trim()) return '-';
    const date = dayjs(value);
    return date.isValid() ? num(`${date.format('DD/MM')}/${date.year() + 543}`) : value;
  };
  const durationHours =
    cover.durationHours ??
    document?.durationPeriods ??
    (template.metadata.estimatedMinutes ? template.metadata.estimatedMinutes / 60 : undefined);
  const durationLabel = durationHours
    ? num(Number.isInteger(durationHours) ? String(durationHours) : durationHours.toFixed(1))
    : '-';
  const gradeLabel =
    cover.gradeLevel || document?.gradeLevels?.join(', ') || template.grade_levels?.join(', ');
  const sections = Array.isArray(content.sections)
    ? content.sections
        .filter((section) => section.enabled !== false)
        .toSorted((left, right) => left.order - right.order)
    : [];
  const hasReusableSectionContent = sections?.some((section) => section.content);
  const resolvedSections = sections.map((section) => {
    const sectionTemplate = section.templateId ? templateById.get(section.templateId) : null;
    const inlineContent = section.content as Record<string, unknown> | undefined;
    const linkedContent = sectionTemplate?.content as Record<string, unknown> | undefined;
    const resolvedContent =
      inlineContent && hasMeaningfulTemplateContent(section.sectionType, inlineContent)
        ? inlineContent
        : linkedContent;
    return { ...section, resolvedContent };
  });
  const objectiveContent = resolvedSections.find(
    (section) => section.sectionType === 'learning_objective'
  )?.resolvedContent as LearningObjectiveContent | undefined;
  const renderedSections =
    content.document && !hasReusableSectionContent
      ? templateDocumentSections(content.document)
      : resolvedSections.map((section) => {
          const resolvedContent = section.resolvedContent ?? {};
          const isLearningStandard = section.sectionType === 'learning_standard';
          const isLearningActivity = section.sectionType === 'learning_activity';
          return {
            id: section.id,
            title: section.title,
            type: section.sectionType,
            content: resolvedContent,
            lines:
              isLearningStandard || isLearningActivity
                ? []
                : templateContentLines(section.sectionType, resolvedContent),
            subsections: isLearningStandard
              ? [
                  { title: 'มาตรฐานการเรียนรู้', lines: structuredContentLines(resolvedContent) },
                  {
                    title: 'ตัวชี้วัดระหว่างทาง',
                    lines: structuredContentLines({ items: resolvedContent.milestoneIndicators }),
                  },
                  {
                    title: 'ตัวชี้วัดปลายทาง',
                    lines: structuredContentLines({ items: resolvedContent.terminalIndicators }),
                  },
                ]
              : isLearningActivity
                ? (
                    (resolvedContent.items as
                      | Array<{ title?: string; description?: string }>
                      | undefined) ?? []
                  ).map((item, index) => ({
                    title: item.title?.trim() || `กิจกรรมที่ ${index + 1}`,
                    lines: asText(item.description).split('\n').filter(Boolean),
                  }))
                : undefined,
            assessmentRows:
              section.sectionType === 'assessment'
                ? mapObjectivesToAssessmentRows(
                    objectiveContent,
                    resolvedContent as AssessmentContent
                  )
                : undefined,
          };
        });

  return (
    <RendererDocument title={template.name} author="EKRU">
      <RendererPage size="A4" style={docStyles.page} wrap>
        {cover.logoUrl ? <RendererImage src={cover.logoUrl} style={docStyles.coverLogo} /> : null}
        <RendererText style={docStyles.coverHeading}>{displayValue(template.name)}</RendererText>
        <RendererView style={docStyles.coverColumns}>
          <RendererView style={docStyles.coverLeft}>
            <RendererText style={docStyles.coverLine}>
              กลุ่มสาระการเรียนรู้ {displayValue(document?.unitName || cover.learningArea)}
            </RendererText>
            <RendererText style={docStyles.coverLine}>
              รายวิชา {displayValue(cover.subjectName || template.subject?.name)} รหัสวิชา{' '}
              {displayValue(cover.subjectCode || template.subject?.code)}
            </RendererText>
            <RendererText style={docStyles.coverLine}>
              เรื่อง {displayValue(cover.topic)}
            </RendererText>
            <RendererText style={docStyles.coverLine}>
              ผู้สอน {displayValue(cover.teacherName)}
            </RendererText>
            <RendererText style={docStyles.coverLine}>
              วันที่สอน {displayTeachingDate(cover.teachingDate)}
            </RendererText>
          </RendererView>
          <RendererView style={docStyles.coverRight}>
            <RendererText style={docStyles.coverLine}>ชั้น {displayValue(gradeLabel)}</RendererText>
            <RendererText style={docStyles.coverLine}>
              ภาคเรียนที่ {displayValue(cover.semester)}
            </RendererText>
            <RendererText style={docStyles.coverLine}>
              เวลา {durationHours ? `${durationLabel} ชั่วโมง` : '-'}
            </RendererText>
            <RendererText style={docStyles.coverLine}>
              ปีการศึกษา {displayValue(cover.academicYear)}
            </RendererText>
          </RendererView>
        </RendererView>
        <RendererView style={docStyles.coverDivider} />

        {renderedSections
          .filter(
            (section) =>
              ![
                'reflection',
                'worksheet_assessment_record',
                'desired_characteristic_assessment',
                'competency_assessment',
                'behavior_observation',
              ].includes(section.type)
          )
          .map((section) => (
            <RendererView key={section.id} style={docStyles.section} minPresenceAhead={80}>
              {showHeadings ? (
                <RendererText style={docStyles.sectionTitle}>
                  {num(renderedSections.findIndex((item) => item.id === section.id) + 1)}.{' '}
                  {section.title}
                </RendererText>
              ) : null}
              {section.subsections ? (
                <RendererView style={docStyles.sectionContent}>
                  {section.subsections.map((subsection) => (
                    <RendererView key={subsection.title}>
                      <RendererText style={docStyles.subsection}>{subsection.title}</RendererText>
                      {subsection.lines.length ? (
                        subsection.lines.map((line, lineIndex) => (
                          <ParagraphLine
                            key={`${section.id}-${subsection.title}-${lineIndex}`}
                            line={line}
                            styles={docStyles}
                          />
                        ))
                      ) : (
                        <RendererText style={docStyles.missing}>ยังไม่ได้ระบุ</RendererText>
                      )}
                    </RendererView>
                  ))}
                </RendererView>
              ) : section.type === 'assessment' && section.assessmentRows?.length ? (
                <RendererView style={docStyles.assessmentTable}>
                  <RendererView
                    style={[docStyles.assessmentRow, docStyles.assessmentHeader]}
                    wrap={false}
                  >
                    {[
                      'รายการประเมิน',
                      'วิธีการวัดและประเมินผล',
                      'เครื่องมือการวัด',
                      'เกณฑ์การประเมิน',
                    ].map((label) => (
                      <RendererText
                        key={label}
                        style={[docStyles.assessmentCell, docStyles.assessmentCellHeader]}
                      >
                        {label}
                      </RendererText>
                    ))}
                  </RendererView>
                  {section.assessmentRows.map((row, rowIndex) => (
                    <RendererView
                      key={row.objectiveId}
                      style={docStyles.assessmentRow}
                      wrap={false}
                    >
                      <RendererText style={docStyles.assessmentCell}>
                        {num(rowIndex + 1)}. {row.issue || '-'}
                      </RendererText>
                      <RendererText style={docStyles.assessmentCell}>
                        {row.method || '-'}
                      </RendererText>
                      <RendererText style={docStyles.assessmentCell}>
                        {row.instrument || '-'}
                      </RendererText>
                      <RendererText style={docStyles.assessmentCell}>
                        {row.criteria || '-'}
                      </RendererText>
                    </RendererView>
                  ))}
                </RendererView>
              ) : (
                <RendererView style={docStyles.sectionContent}>
                  {section.lines.length ? (
                    section.lines.map((line, lineIndex) => (
                      <ParagraphLine
                        key={`${section.id}-${lineIndex}`}
                        line={line}
                        styles={docStyles}
                      />
                    ))
                  ) : (
                    <RendererText style={docStyles.missing}>
                      หัวข้อนี้ยังไม่ได้เชื่อมกับ Template ย่อย
                    </RendererText>
                  )}
                </RendererView>
              )}
            </RendererView>
          ))}
      </RendererPage>
      {renderedSections
        .filter((section) => section.type === 'reflection')
        .map((section) => {
          const reflection =
            (resolvedSections.find((item) => item.id === section.id)?.resolvedContent as
              | Record<string, unknown>
              | undefined) ?? {};
          const writeLines = (value: unknown, count = 2) => {
            const text = asText(value);
            const lines = text ? text.split('\n').filter(Boolean) : [];
            return Array.from({ length: Math.max(count, lines.length) }, (_, index) => (
              <RendererText
                key={`${section.id}-writing-${String(value)}-${index}`}
                style={docStyles.reflectionWritingLine}
              >
                {lines[index] ?? ''}
              </RendererText>
            ));
          };
          const specialStudents = ((reflection.specialStudents ?? []) as string[]).filter(Boolean);
          const sectionNumber = renderedSections.findIndex((item) => item.id === section.id) + 1;
          return (
            <RendererPage key={section.id} size="A4" style={docStyles.page} wrap={false}>
              <RendererText style={docStyles.reflectionHeading}>
                {num(sectionNumber)}. บันทึกผลหลังการสอน
              </RendererText>
              <RendererText style={docStyles.reflectionSubheading}>
                ๑. ผลการจัดการเรียนรู้
              </RendererText>
              <RendererView style={docStyles.reflectionBody}>
                <RendererView style={docStyles.reflectionRow}>
                  <RendererText style={docStyles.reflectionLabel}>นักเรียนจำนวน</RendererText>
                  <RendererText style={docStyles.reflectionFill}>
                    {String(reflection.studentCount ?? '')}
                  </RendererText>
                  <RendererText style={docStyles.reflectionLabel}>คน</RendererText>
                </RendererView>
                <RendererView style={docStyles.reflectionRow}>
                  <RendererText style={docStyles.reflectionLabel}>
                    ผ่านจุดประสงค์การเรียนรู้
                  </RendererText>
                  <RendererText style={docStyles.reflectionFill}>
                    {String(reflection.passedCount ?? '')}
                  </RendererText>
                  <RendererText style={docStyles.reflectionLabel}>คน คิดเป็นร้อยละ</RendererText>
                  <RendererText style={docStyles.reflectionFill}>
                    {String(reflection.passedPercentage ?? '')}
                  </RendererText>
                </RendererView>
                <RendererView style={docStyles.reflectionRow}>
                  <RendererText style={docStyles.reflectionLabel}>
                    ไม่ผ่านจุดประสงค์การเรียนรู้
                  </RendererText>
                  <RendererText style={docStyles.reflectionFill}>
                    {String(reflection.notPassedCount ?? '')}
                  </RendererText>
                  <RendererText style={docStyles.reflectionLabel}>คน คิดเป็นร้อยละ</RendererText>
                  <RendererText style={docStyles.reflectionFill}>
                    {String(reflection.notPassedPercentage ?? '')}
                  </RendererText>
                </RendererView>
                <RendererView style={docStyles.reflectionBlock}>
                  <RendererText style={docStyles.reflectionBlockTitle}>
                    นักเรียนที่มีความสามารถพิเศษ/นักเรียนเด็กพิเศษ ได้แก่
                  </RendererText>
                  {writeLines(specialStudents.join('\n'), 2)}
                </RendererView>
                {[
                  ['ผลการจัดการเรียนรู้ด้านความรู้ (K)', reflection.knowledgeResult, 2],
                  ['ผลการจัดการเรียนรู้ด้านทักษะ/กระบวนการ (P)', reflection.processResult, 2],
                  ['ผลการจัดการเรียนรู้ด้านคุณลักษณะ (A)', reflection.attitudeResult, 2],
                  ['๒. ปัญหา/อุปสรรค', reflection.problems, 2],
                  ['๓. แนวทางแก้ไข/ข้อเสนอแนะ', reflection.solutions, 3],
                ].map(([label, value, count]) => (
                  <RendererView key={String(label)} style={docStyles.reflectionBlock}>
                    <RendererText style={docStyles.reflectionBlockTitle}>
                      {String(label)}
                    </RendererText>
                    {writeLines(value, Number(count))}
                  </RendererView>
                ))}
              </RendererView>
              <RendererView style={docStyles.reflectionSignature}>
                <RendererText style={docStyles.reflectionSignatureLine}>
                  ลงชื่อ................................................ครูผู้สอน
                </RendererText>
                <RendererText style={docStyles.reflectionSignatureLine}>
                  ( {cover.teacherName || '................................................'} )
                </RendererText>
                <RendererText style={docStyles.reflectionSignatureLine}>ตำแหน่ง ครู</RendererText>
              </RendererView>
            </RendererPage>
          );
        })}
      {renderedSections
        .filter((section) => section.type === 'worksheet_assessment_record')
        .map((section) => {
          const record =
            (resolvedSections.find((item) => item.id === section.id)?.resolvedContent as
              | WorksheetAssessmentRecordContent
              | undefined) ?? ({} as WorksheetAssessmentRecordContent);
          const scoreColumns = record.scoreColumns ?? [];
          const students = record.students ?? [];
          const rubricCriteria = record.rubricCriteria ?? [];
          const studentNameWidthValue =
            scoreColumns.length <= 3 ? 29 : Math.max(18, 40 - scoreColumns.length * 2);
          const scoreWidth = scoreColumns.length
            ? `${(72 - studentNameWidthValue) / scoreColumns.length}%`
            : '43%';
          const studentNameWidth = `${studentNameWidthValue}%`;
          const rubricLevelCount = Math.max(
            1,
            ...rubricCriteria.map((criterion) => criterion.levels?.length ?? 0)
          );
          const rubricLevelWidth = `${74 / rubricLevelCount}%`;

          return (
            <RendererPage key={section.id} size="A4" style={docStyles.page} wrap>
              <RendererText style={docStyles.worksheetTitle}>
                {record.title || 'แบบบันทึกผลการประเมินใบงาน'}
              </RendererText>
              <RendererText style={docStyles.worksheetTopic}>
                เรื่อง {record.topic || cover.topic || '-'}
              </RendererText>

              <RendererView style={docStyles.worksheetTable}>
                <RendererView
                  style={[docStyles.worksheetRow, docStyles.worksheetHeader]}
                  wrap={false}
                >
                  <RendererText
                    style={[
                      docStyles.worksheetCell,
                      docStyles.worksheetCellHeader,
                      { width: '5%' },
                    ]}
                  >
                    ที่
                  </RendererText>
                  <RendererText
                    style={[
                      docStyles.worksheetCell,
                      docStyles.worksheetCellHeader,
                      { width: studentNameWidth },
                    ]}
                  >
                    ชื่อ-สกุล
                  </RendererText>
                  {scoreColumns.map((column) => (
                    <RendererText
                      key={column.id}
                      style={[
                        docStyles.worksheetCell,
                        docStyles.worksheetCellHeader,
                        { width: scoreWidth },
                      ]}
                    >
                      {column.title || '-'}
                      {`\n`}({Number(column.maximumScore || 0)})
                    </RendererText>
                  ))}
                  <RendererText
                    style={[
                      docStyles.worksheetCell,
                      docStyles.worksheetCellHeader,
                      { width: '9%' },
                    ]}
                  >
                    รวม
                  </RendererText>
                  <RendererText
                    style={[
                      docStyles.worksheetCell,
                      docStyles.worksheetCellHeader,
                      { width: '14%' },
                    ]}
                  >
                    ผลการประเมิน
                  </RendererText>
                </RendererView>
                {students.map((student, studentIndex) => {
                  const scores = scoreColumns.map((_, index) =>
                    Number(student.scores?.[index] || 0)
                  );
                  const total = scores.reduce((sum, score) => sum + score, 0);
                  const result =
                    student.result ||
                    (total >= Number(record.passingScore || 0) ? 'ผ่าน' : 'ไม่ผ่าน');
                  return (
                    <RendererView
                      key={student.id || studentIndex}
                      style={docStyles.worksheetRow}
                      wrap={false}
                    >
                      <RendererText
                        style={[
                          docStyles.worksheetCell,
                          docStyles.worksheetCellCenter,
                          { width: '5%' },
                        ]}
                      >
                        {studentIndex + 1}
                      </RendererText>
                      <RendererText style={[docStyles.worksheetCell, { width: studentNameWidth }]}>
                        {student.name || '-'}
                      </RendererText>
                      {scores.map((score, scoreIndex) => (
                        <RendererText
                          key={`${student.id || studentIndex}-${scoreColumns[scoreIndex]?.id || scoreIndex}`}
                          style={[
                            docStyles.worksheetCell,
                            docStyles.worksheetCellCenter,
                            { width: scoreWidth },
                          ]}
                        >
                          {score}
                        </RendererText>
                      ))}
                      <RendererText
                        style={[
                          docStyles.worksheetCell,
                          docStyles.worksheetCellCenter,
                          { width: '9%' },
                        ]}
                      >
                        {total}
                      </RendererText>
                      <RendererText
                        style={[
                          docStyles.worksheetCell,
                          docStyles.worksheetCellCenter,
                          { width: '14%' },
                        ]}
                      >
                        {result}
                      </RendererText>
                    </RendererView>
                  );
                })}
              </RendererView>

              <RendererText style={docStyles.worksheetSectionTitle}>
                เกณฑ์การประเมินใบงาน เรื่อง {record.topic || cover.topic || '-'}
              </RendererText>
              <RendererView style={docStyles.worksheetTable}>
                <RendererView
                  style={[docStyles.worksheetRow, docStyles.worksheetHeader]}
                  wrap={false}
                >
                  <RendererText
                    style={[
                      docStyles.worksheetCell,
                      docStyles.worksheetCellHeader,
                      { width: '26%' },
                    ]}
                  >
                    รายการการประเมิน
                  </RendererText>
                  {Array.from({ length: rubricLevelCount }, (_, levelIndex) => {
                    const sample = rubricCriteria.find(
                      (criterion) => criterion.levels?.[levelIndex]
                    )?.levels[levelIndex];
                    return (
                      <RendererText
                        key={`rubric-header-${levelIndex}`}
                        style={[
                          docStyles.worksheetCell,
                          docStyles.worksheetCellHeader,
                          { width: rubricLevelWidth },
                        ]}
                      >
                        {sample ? `${sample.level} (${sample.label})` : `ระดับ ${levelIndex + 1}`}
                      </RendererText>
                    );
                  })}
                </RendererView>
                {rubricCriteria.map((criterion, criterionIndex) => (
                  <RendererView
                    key={criterion.id || criterionIndex}
                    style={docStyles.worksheetRow}
                    wrap={false}
                  >
                    <RendererText style={[docStyles.worksheetCell, { width: '26%' }]}>
                      {criterionIndex + 1}. {criterion.title || '-'}
                    </RendererText>
                    {Array.from({ length: rubricLevelCount }, (_, levelIndex) => (
                      <RendererText
                        key={`${criterion.id || criterionIndex}-level-${levelIndex}`}
                        style={[docStyles.worksheetCell, { width: rubricLevelWidth }]}
                      >
                        {criterion.levels?.[levelIndex]?.description || '-'}
                      </RendererText>
                    ))}
                  </RendererView>
                ))}
              </RendererView>
              <RendererText style={docStyles.worksheetNote}>
                เกณฑ์การผ่าน:{' '}
                {record.passingCriteria ||
                  `ได้คะแนนรวมไม่น้อยกว่า ${record.passingScore ?? 0} คะแนน`}
              </RendererText>

              <RendererView style={docStyles.worksheetSignature} wrap={false}>
                <RendererText style={docStyles.worksheetSignatureLine}>
                  ลงชื่อ................................................
                  {record.evaluatorRole || 'ผู้ประเมิน'}
                </RendererText>
                <RendererText style={docStyles.worksheetSignatureLine}>
                  ( {record.evaluatorName || '................................................'} )
                </RendererText>
                <RendererText style={docStyles.worksheetSignatureLine}>
                  {record.evaluationDate || 'วันที่ .......... / .......... / ..........'}
                </RendererText>
              </RendererView>
            </RendererPage>
          );
        })}
      {renderedSections
        .filter((section) => section.type === 'desired_characteristic_assessment')
        .map((section) => {
          const assessment =
            (resolvedSections.find((item) => item.id === section.id)?.resolvedContent as
              | DesiredCharacteristicAssessmentContent
              | undefined) ?? ({} as DesiredCharacteristicAssessmentContent);
          return (
            <DesiredCharacteristicAssessmentPage
              key={section.id}
              assessment={assessment}
              styles={docStyles}
            />
          );
        })}
      {renderedSections
        .filter((section) => section.type === 'competency_assessment')
        .flatMap((section) => {
          const assessment =
            (resolvedSections.find((item) => item.id === section.id)?.resolvedContent as
              | CompetencyAssessmentContent
              | undefined) ?? ({} as CompetencyAssessmentContent);
          return (assessment.domains ?? []).map((domain, domainIndex) => (
            <CompetencyAssessmentPage
              key={`${section.id}-${domain.id || domainIndex}`}
              assessment={assessment}
              domain={domain}
              domainIndex={domainIndex}
              styles={docStyles}
            />
          ));
        })}
      {renderedSections
        .filter((section) => section.type === 'behavior_observation')
        .map((section) => {
          const observation =
            (resolvedSections.find((item) => item.id === section.id)?.resolvedContent as
              | BehaviorObservationContent
              | undefined) ?? ({} as BehaviorObservationContent);
          return (
            <BehaviorObservationPage
              key={section.id}
              observation={observation}
              styles={docStyles}
            />
          );
        })}
    </RendererDocument>
  );
}

export default function LessonPlanTemplatePdfViewer({
  template,
  sectionTemplates = [],
  onPdfReady,
}: {
  template: LessonTemplate;
  sectionTemplates?: LessonTemplate[];
  onPdfReady: (url: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(720);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const pdfDocument = useMemo(
    () => <LessonPlanTemplatePdfDocument template={template} sectionTemplates={sectionTemplates} />,
    [sectionTemplates, template]
  );
  const [pdfState, setPdfState] = useState<{
    url: string | null;
    loading: boolean;
    error: Error | null;
  }>({ url: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setPdfState({ url: null, loading: true, error: null });
    const renderPdf = async () => {
      try {
        return await Promise.resolve().then(() => createPdf(pdfDocument).toBlob());
      } catch (firstError) {
        console.warn('[lesson-plan-template-pdf] first render failed; retrying once', {
          templateId: template.id,
          error: firstError,
        });
        return Promise.resolve().then(() => createPdf(pdfDocument).toBlob());
      }
    };

    renderPdf()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfState({ url: objectUrl, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('[lesson-plan-template-pdf] render failed', {
          templateId: template.id,
          templateName: template.name,
          sectionCount: (template.content as LessonPlanTemplateContent).sections?.length ?? 0,
          error,
        });
        setPdfState({
          url: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unable to create PDF'),
        });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfDocument, renderAttempt, template.content, template.id, template.name]);

  useEffect(() => {
    if (pdfState.url) onPdfReady(pdfState.url);
  }, [onPdfReady, pdfState.url]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 720;
      setPageWidth(Math.max(280, Math.min(760, width - 32)));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (!container || !pageCount) return undefined;
    const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-page]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const visiblePage = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const pageNumber = Number(
          (visiblePage?.target as HTMLElement | undefined)?.dataset.pdfPage
        );
        if (pageNumber) setActivePage(pageNumber);
      },
      { root: container, threshold: [0.25, 0.5, 0.75] }
    );
    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [pageCount, template.id]);

  if (pdfState.loading)
    return (
      <Box
        sx={{
          gridColumn: { lg: '1 / span 2' },
          minHeight: 540,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  if (pdfState.error || !pdfState.url)
    return (
      <Alert severity="error" sx={{ gridColumn: { lg: '1 / span 2' }, m: 2 }}>
        <Typography variant="subtitle2">ไม่สามารถสร้าง PDF จาก Template นี้ได้</Typography>
        <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
          {pdfState.error?.message || 'ไม่พบไฟล์ PDF ที่สร้างเสร็จแล้ว'}
        </Typography>
        <Button
          size="small"
          color="error"
          variant="outlined"
          onClick={() => setRenderAttempt((current) => current + 1)}
          sx={{ mt: 1 }}
        >
          ลองสร้าง PDF อีกครั้ง
        </Button>
      </Alert>
    );

  return (
    <Box
      sx={{
        minWidth: 0,
        display: 'grid',
        gridColumn: { lg: '1 / span 2' },
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '190px minmax(0, 1fr)' },
        '& > .react-pdf__Document': { display: 'contents' },
      }}
    >
      <Document
        file={pdfState.url}
        onLoadSuccess={({ numPages }) => {
          setPageCount(numPages);
          setActivePage(1);
        }}
      >
        <Box
          component="nav"
          aria-label={`หน้าทั้งหมดของ ${template.name}`}
          sx={{
            p: 2,
            gap: 1.5,
            display: 'flex',
            overflow: 'auto',
            bgcolor: 'background.paper',
            borderRight: { lg: '1px solid' },
            borderBottom: { xs: '1px solid', lg: 0 },
            borderColor: 'divider',
            flexDirection: { xs: 'row', lg: 'column' },
            maxHeight: { lg: 'calc(100vh - 0px)' },
          }}
        >
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <Box key={pageNumber} sx={{ minWidth: { xs: 150, lg: 0 } }}>
                <Typography
                  variant="caption"
                  color={activePage === pageNumber ? 'primary.main' : 'text.secondary'}
                  sx={{ fontWeight: activePage === pageNumber ? 700 : 400 }}
                >
                  {pageNumber} / {pageCount}
                </Typography>
                <CardActionArea
                  onClick={() => {
                    setActivePage(pageNumber);
                    document
                      .getElementById(`template-pdf-page-${template.id}-${pageNumber}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  aria-label={`เปิดหน้า ${pageNumber} ของ ${template.name}`}
                  sx={{
                    mt: 0.5,
                    p: 0.75,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: activePage === pageNumber ? 'primary.main' : 'divider',
                    borderRadius: 1.25,
                    bgcolor: 'common.white',
                    boxShadow:
                      activePage === pageNumber
                        ? (theme) => `0 0 0 2px ${theme.palette.primary.main}22`
                        : 'none',
                  }}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={145}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </CardActionArea>
              </Box>
            );
          })}
        </Box>

        <Box
          ref={contentRef}
          sx={{
            p: { xs: 1.5, sm: 3 },
            gap: 3,
            minWidth: 0,
            display: 'grid',
            overflow: 'auto',
            alignContent: 'start',
            bgcolor: 'grey.100',
            maxHeight: { lg: 'calc(100vh - 0px)' },
          }}
        >
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <Box
                key={pageNumber}
                id={`template-pdf-page-${template.id}-${pageNumber}`}
                data-pdf-page={pageNumber}
                sx={{ mx: 'auto', boxShadow: (theme) => theme.vars.customShadows.z16 }}
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Box>
            );
          })}
        </Box>
      </Document>
    </Box>
  );
}
