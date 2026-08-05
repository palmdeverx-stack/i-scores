'use client';

import type {
  TemplateType,
  TemplateOption,
  SectionTemplateContent,
  LearningObjectiveContent,
} from '../types';

import { memo, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { defaultTemplateContent } from '../template-defaults';
import { RubricFields } from './template-content-fields/rubric-fields';
import { ASSESSMENT_TYPE_OPTIONS } from './template-content-fields/constants';
import { TEMPLATE_TYPE_LABELS, LESSON_PLAN_SECTION_TYPES } from '../constants';
import { uid, contentName, useArrayValue } from './template-content-fields/helpers';
import { StructuredListFields } from './template-content-fields/structured-list-fields';
import { ObjectiveAssessmentFields } from './template-content-fields/objective-assessment-fields';
import { BehaviorObservationFields } from './template-content-fields/behavior-observation-fields';
import { TopicsFields, LearningObjectivesFields } from './template-content-fields/learning-fields';
import { CompetencyAssessmentFields } from './template-content-fields/competency-assessment-fields';
import { WorksheetAssessmentRecordFields } from './template-content-fields/worksheet-assessment-fields';
import {
  MediaFields,
  QuestionsFields,
  ReflectionFields,
} from './template-content-fields/resource-fields';
import {
  ActivityListFields,
  LearningStandardFields,
} from './template-content-fields/lesson-content-fields';
import {
  RowActions,
  StringListField,
  TemplateStarterPicker,
} from './template-content-fields/common-fields';
import { DesiredCharacteristicAssessmentFields } from './template-content-fields/desired-characteristic-assessment-fields';

function LessonPlanSectionsFields({ templateOptions }: { templateOptions: TemplateOption[] }) {
  const rows = useArrayValue<{
    id: string;
    sectionType: TemplateType;
    templateId?: string;
    title: string;
    order: number;
    required: boolean;
    content?: SectionTemplateContent;
  }>('content.sections');
  const [selectedSectionId, setSelectedSectionId] = useState<string>();
  const selectedIndex = Math.max(
    0,
    rows.value.findIndex((row) => row.id === selectedSectionId)
  );
  const selectedSection = rows.value[selectedIndex];

  const updateRow = (index: number, patch: Partial<(typeof rows.value)[number]>) =>
    rows.update(
      rows.value.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item))
    );

  const addSection = () => {
    const id = uid();
    rows.update([
      ...rows.value,
      {
        id,
        sectionType: 'learning_objective',
        title: TEMPLATE_TYPE_LABELS.learning_objective,
        order: rows.value.length,
        required: true,
        content: defaultTemplateContent('learning_objective') as SectionTemplateContent,
      },
    ]);
    setSelectedSectionId(id);
  };

  return (
    <Box sx={{ gap: 2, display: 'grid' }}>
      <Alert severity="info">
        เลือกประเภทหัวข้อจาก Master แล้วกรอกเนื้อหาตัวอย่างด้วยฟอร์มกลางด้านขวา
      </Alert>
      <Box
        sx={{
          gap: 2,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(260px, 0.75fr) minmax(0, 1.25fr)' },
        }}
      >
        <Box sx={{ gap: 1.25, display: 'grid' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1">หัวข้อแผนการสอน ({rows.value.length})</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RemixIcon icon="mingcute:add-line" />}
              onClick={addSection}
            >
              เพิ่มหัวข้อ
            </Button>
          </Box>
          {rows.value.map((row, index) => {
            const active = index === selectedIndex;
            return (
              <Box
                key={row.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSectionId(row.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelectedSectionId(row.id);
                }}
                sx={{
                  p: 1.5,
                  gap: 0.5,
                  display: 'grid',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  bgcolor: active ? 'primary.lighter' : 'background.paper',
                }}
              >
                <Typography variant="subtitle2">
                  {index + 1}. {row.title || TEMPLATE_TYPE_LABELS[row.sectionType]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {TEMPLATE_TYPE_LABELS[row.sectionType]}
                </Typography>
                <RowActions
                  index={index}
                  total={rows.value.length}
                  onMove={rows.move}
                  onRemove={() => rows.remove(index)}
                />
              </Box>
            );
          })}
        </Box>

        {selectedSection ? (
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              gap: 2,
              display: 'grid',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
            }}
          >
            <Typography variant="h6">แก้ไขหัวข้อที่ {selectedIndex + 1}</Typography>
            <Field.Text
              required
              name={`content.sections.${selectedIndex}.title`}
              label="ชื่อหัวข้อ"
            />
            <Field.Select
              name={`content.sections.${selectedIndex}.sectionType`}
              label="ประเภท Template"
              helperText="ดึงจาก Master ประเภท Template"
              onChange={(event) => {
                const sectionType = event.target.value as TemplateType;
                updateRow(selectedIndex, {
                  sectionType,
                  templateId: undefined,
                  title: TEMPLATE_TYPE_LABELS[sectionType],
                  content: defaultTemplateContent(sectionType) as SectionTemplateContent,
                });
              }}
            >
              {LESSON_PLAN_SECTION_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Field.Select>
            <Field.Select
              name={`content.sections.${selectedIndex}.templateId`}
              label="เลือกเนื้อหาตั้งต้นจาก Master Template"
              onChange={(event) => {
                const templateId = event.target.value;
                const selected = templateOptions.find((template) => template.id === templateId);
                updateRow(selectedIndex, {
                  templateId: templateId || undefined,
                  title: selected?.name ?? selectedSection.title,
                  content: selected
                    ? (structuredClone(selected.content) as SectionTemplateContent)
                    : (defaultTemplateContent(
                        selectedSection.sectionType
                      ) as SectionTemplateContent),
                });
              }}
            >
              <MenuItem value="">เริ่มจากฟอร์มว่าง</MenuItem>
              {templateOptions
                .filter((template) => template.template_type === selectedSection.sectionType)
                .map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
            </Field.Select>
            <Field.Switch
              name={`content.sections.${selectedIndex}.required`}
              label="หัวข้อนี้จำเป็นต้องมีในแผน"
            />
            <Divider />
            <Box>
              <Typography variant="subtitle1">เนื้อหาตัวอย่าง</Typography>
              <Typography variant="body2" color="text.secondary">
                ฟอร์มเปลี่ยนอัตโนมัติตามประเภท Template โดยใช้ component ชุดเดียวกัน
              </Typography>
            </Box>
            {selectedSection.content ? (
              <TemplateContentFields
                templateType={selectedSection.sectionType}
                templateOptions={templateOptions}
                contentPath={`content.sections.${selectedIndex}.content`}
              />
            ) : (
              <Button
                variant="outlined"
                onClick={() =>
                  updateRow(selectedIndex, {
                    content: defaultTemplateContent(
                      selectedSection.sectionType
                    ) as SectionTemplateContent,
                  })
                }
              >
                สร้างฟอร์มเนื้อหาตัวอย่าง
              </Button>
            )}
          </Box>
        ) : (
          <Alert severity="warning">กรุณาเพิ่มหัวข้อแผนการสอนอย่างน้อย 1 หัวข้อ</Alert>
        )}
      </Box>
    </Box>
  );
}

function TemplateContentFieldsComponent({
  templateType,
  templateOptions = [],
  contentPath = 'content',
  studentRosterPath,
  objectiveContent,
}: {
  templateType: TemplateType;
  templateOptions?: TemplateOption[];
  contentPath?: string;
  studentRosterPath?: string;
  objectiveContent?: LearningObjectiveContent;
}) {
  if (templateType === 'learning_standard')
    return <LearningStandardFields contentPath={contentPath} templateOptions={templateOptions} />;
  if (templateType === 'learning_objective')
    return <LearningObjectivesFields contentPath={contentPath} templateOptions={templateOptions} />;
  if (templateType === 'essential_content')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <TemplateStarterPicker
          templateType={templateType}
          templateOptions={templateOptions}
          contentPath={contentPath}
        />
        <Field.Editor
          name={contentName(contentPath, 'content')}
          placeholder="อธิบายแนวคิด เนื้อหา และสาระสำคัญของหน่วยการเรียนรู้"
        />
        <StringListField name={contentName(contentPath, 'keyConcepts')} label="แนวคิดสำคัญ" />
      </Box>
    );
  if (templateType === 'learning_content') return <TopicsFields contentPath={contentPath} />;
  if (templateType === 'learning_activity') return <ActivityListFields contentPath={contentPath} />;
  if (templateType === 'assessment' && objectiveContent)
    return (
      <ObjectiveAssessmentFields contentPath={contentPath} objectiveContent={objectiveContent} />
    );
  if (templateType === 'assessment')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Field.Select name={contentName(contentPath, 'assessmentType')} label="ประเภทการประเมิน">
          {ASSESSMENT_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Field.Select>
        {[
          ['method', 'วิธีการประเมิน'],
          ['instrument', 'เครื่องมือ'],
          ['evidence', 'หลักฐาน'],
          ['criteria', 'เกณฑ์'],
        ].map(([name, label]) => (
          <Field.Text
            key={name}
            required
            multiline
            name={contentName(contentPath, name)}
            label={label}
          />
        ))}
        <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Field.Text
            type="number"
            name={contentName(contentPath, 'maximumScore')}
            label="คะแนนเต็ม"
          />
          <Field.Text
            type="number"
            name={contentName(contentPath, 'passingScore')}
            label="คะแนนผ่าน"
          />
        </Box>
      </Box>
    );
  if (templateType === 'rubric') return <RubricFields contentPath={contentPath} />;
  if (templateType === 'media')
    return <MediaFields contentPath={contentPath} templateOptions={templateOptions} />;
  if (templateType === 'question')
    return <QuestionsFields contentPath={contentPath} templateOptions={templateOptions} />;
  if (templateType === 'reflection')
    return <ReflectionFields contentPath={contentPath} templateOptions={templateOptions} />;
  if (templateType === 'worksheet_assessment_record')
    return (
      <WorksheetAssessmentRecordFields
        contentPath={contentPath}
        templateOptions={templateOptions}
        studentRosterPath={studentRosterPath}
      />
    );
  if (templateType === 'desired_characteristic_assessment')
    return (
      <DesiredCharacteristicAssessmentFields
        contentPath={contentPath}
        templateOptions={templateOptions}
        studentRosterPath={studentRosterPath}
      />
    );
  if (templateType === 'competency_assessment')
    return (
      <CompetencyAssessmentFields
        contentPath={contentPath}
        templateOptions={templateOptions}
        studentRosterPath={studentRosterPath}
      />
    );
  if (templateType === 'behavior_observation')
    return (
      <BehaviorObservationFields
        contentPath={contentPath}
        templateOptions={templateOptions}
        studentRosterPath={studentRosterPath}
      />
    );
  if (
    templateType === 'competency' ||
    templateType === 'desired_characteristic' ||
    templateType === 'learner_development' ||
    templateType === 'learning_task'
  )
    return (
      <StructuredListFields
        templateType={templateType}
        contentPath={contentPath}
        templateOptions={templateOptions}
      />
    );
  return <LessonPlanSectionsFields templateOptions={templateOptions} />;
}

export const TemplateContentFields = memo(TemplateContentFieldsComponent);
