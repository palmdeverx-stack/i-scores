import type { TemplateType, TemplateInput } from '../types';

import * as z from 'zod';

import { mediaSchema } from './media.schema';
import { rubricSchema } from './rubric.schema';
import { questionSchema } from './question.schema';
import { assessmentSchema } from './assessment.schema';
import { reflectionSchema } from './reflection.schema';
import { templateBaseSchema } from './template-base.schema';
import { lessonPlanTemplateSchema } from './lesson-plan.schema';
import { structuredListSchema } from './structured-list.schema';
import { learningContentSchema } from './learning-content.schema';
import { essentialContentSchema } from './essential-content.schema';
import { learningActivitySchema } from './learning-activity.schema';
import { learningObjectiveSchema } from './learning-objective.schema';
import { behaviorObservationSchema } from './behavior-observation.schema';
import { competencyAssessmentSchema } from './competency-assessment.schema';
import { worksheetAssessmentRecordSchema } from './worksheet-assessment-record.schema';
import { desiredCharacteristicAssessmentSchema } from './desired-characteristic-assessment.schema';

export const CONTENT_SCHEMAS: Record<TemplateType, z.ZodType> = {
  learning_standard: structuredListSchema,
  learning_objective: learningObjectiveSchema,
  essential_content: essentialContentSchema,
  learning_content: learningContentSchema,
  learning_activity: learningActivitySchema,
  assessment: assessmentSchema,
  behavior_observation: behaviorObservationSchema,
  competency_assessment: competencyAssessmentSchema,
  desired_characteristic_assessment: desiredCharacteristicAssessmentSchema,
  rubric: rubricSchema,
  media: mediaSchema,
  question: questionSchema,
  reflection: reflectionSchema,
  worksheet_assessment_record: worksheetAssessmentRecordSchema,
  competency: structuredListSchema,
  desired_characteristic: structuredListSchema,
  learner_development: structuredListSchema,
  learning_task: structuredListSchema,
  lesson_plan: lessonPlanTemplateSchema,
};

export const templateInputSchema = templateBaseSchema
  .extend({ content: z.unknown() })
  .superRefine((value, context) => {
    const result = CONTENT_SCHEMAS[value.templateType].safeParse(value.content);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({ ...issue, path: ['content', ...issue.path] });
      }
    }
  });

export function parseTemplateInput(input: unknown): TemplateInput {
  const legacyCompatibleInput =
    input && typeof input === 'object'
      ? {
          curriculumId: null,
          unitId: null,
          learningOutcomeIds: [],
          ...input,
        }
      : input;
  const base = templateInputSchema.parse(legacyCompatibleInput);
  return {
    ...base,
    content: CONTENT_SCHEMAS[base.templateType].parse(base.content),
  } as TemplateInput;
}

export * from './media.schema';
export * from './rubric.schema';
export * from './question.schema';
export * from './assessment.schema';
export * from './reflection.schema';
export * from './lesson-plan.schema';
export * from './template-base.schema';
export * from './structured-list.schema';
export * from './learning-content.schema';
export * from './essential-content.schema';
export * from './learning-activity.schema';
export * from './learning-objective.schema';
export * from './behavior-observation.schema';
export * from './competency-assessment.schema';
export * from './worksheet-assessment-record.schema';
export * from './desired-characteristic-assessment.schema';
