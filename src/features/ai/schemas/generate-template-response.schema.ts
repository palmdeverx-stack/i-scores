import type { TemplateType } from 'src/features/templates/types';

import * as z from 'zod';

const text = (max = 5000) => z.string().trim().max(max);
const nullableText = (max = 5000) => text(max).nullable();

const learningObjectiveAIContentSchema = z.object({
  objectives: z
    .array(
      z.object({
        id: text(100),
        description: text(),
        domain: z.enum(['knowledge', 'process', 'attitude']),
        behaviorVerb: nullableText(200),
        condition: nullableText(1000),
        expectedResult: nullableText(2000),
        successCriteria: nullableText(2000),
      })
    )
    .min(1)
    .max(100),
});

const essentialContentAIContentSchema = z.object({
  content: text(30000),
  keyConcepts: z.array(text(500)).max(100),
});

const learningContentAIContentSchema = z.object({
  topics: z
    .array(
      z.object({
        id: text(100),
        title: text(500),
        description: nullableText(5000),
        order: z.number().int(),
      })
    )
    .min(1)
    .max(100),
});

const learningActivityAIContentSchema = z.object({
  activityName: text(500),
  teachingMethod: nullableText(500),
  phase: z.enum(['introduction', 'learning', 'practice', 'conclusion']),
  durationMinutes: z.number().int().min(1).max(10000).nullable(),
  objectives: z.array(text(2000)).max(100),
  teacherActions: z.array(text(5000)).max(100),
  studentActions: z.array(text(5000)).max(100),
  requiredMaterials: z.array(text(2000)).max(100),
  expectedOutputs: z.array(text(2000)).max(100),
  groupType: z.enum(['individual', 'pair', 'group', 'whole_class']).nullable(),
});

const assessmentAIContentSchema = z.object({
  assessmentType: z.enum([
    'test',
    'worksheet',
    'observation',
    'performance',
    'project',
    'presentation',
    'interview',
    'portfolio',
  ]),
  method: text(),
  instrument: text(),
  evidence: text(),
  criteria: text(),
  passingScore: z.number().min(0).nullable(),
  maximumScore: z.number().positive().nullable(),
});

const rubricAIContentSchema = z.object({
  rubricType: z.enum(['analytic', 'holistic', 'checklist', 'rating_scale']),
  scoreType: z.enum(['score', 'percentage', 'level']),
  maximumScore: z.number().positive().nullable(),
  passingScore: z.number().min(0).nullable(),
  criteria: z
    .array(
      z.object({
        id: text(100),
        name: text(500),
        description: nullableText(2000),
        weight: z.number().min(0).max(100).nullable(),
        levels: z
          .array(
            z.object({
              id: text(100),
              level: z.number().int().min(1),
              label: text(200),
              score: z.number().min(0),
              description: text(),
            })
          )
          .min(2)
          .max(10),
      })
    )
    .min(1)
    .max(50),
});

const mediaAIContentSchema = z.object({
  mediaType: z.enum([
    'worksheet',
    'slide',
    'video',
    'website',
    'book',
    'game',
    'quiz',
    'equipment',
    'other',
  ]),
  title: text(500),
  description: nullableText(5000),
  url: nullableText(2000),
  marketplaceProductId: nullableText(100),
  usageInstructions: nullableText(5000),
});

const questionAIContentSchema = z.object({
  questions: z
    .array(
      z.object({
        id: text(100),
        question: text(),
        bloomLevel: z
          .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
          .nullable(),
        expectedAnswer: nullableText(10000),
        followUpQuestions: z.array(text()).max(20),
      })
    )
    .min(1)
    .max(100),
});

const reflectionAIContentSchema = z.object({
  sections: z
    .array(
      z.object({
        id: text(100),
        title: text(500),
        placeholder: nullableText(2000),
        required: z.boolean(),
      })
    )
    .min(1)
    .max(50),
});

const structuredListAIContentSchema = z.object({
  items: z
    .array(
      z.object({
        id: text(100),
        code: nullableText(100),
        title: text(500),
        description: text(10000),
      })
    )
    .min(1)
    .max(100),
});

const lessonPlanAIContentSchema = z.object({
  sections: z
    .array(
      z.object({
        id: text(100),
        sectionType: z.enum([
          'learning_standard',
          'learning_objective',
          'essential_content',
          'learning_content',
          'learning_activity',
          'assessment',
          'rubric',
          'media',
          'question',
          'reflection',
          'worksheet_assessment_record',
          'competency',
          'competency_assessment',
          'behavior_observation',
          'desired_characteristic',
          'desired_characteristic_assessment',
          'learner_development',
          'learning_task',
          'lesson_plan',
        ]),
        templateId: nullableText(100),
        title: text(500),
        order: z.number().int(),
        required: z.boolean(),
        enabled: z.boolean().optional(),
      })
    )
    .min(1)
    .max(50),
});

const worksheetAssessmentRecordAIContentSchema = z.object({
  title: text(300),
  topic: text(500),
  scoreColumns: z
    .array(
      z.object({
        id: text(100),
        title: text(200),
        maximumScore: z.number().min(0).max(1000),
      })
    )
    .min(1)
    .max(10),
  students: z
    .array(
      z.object({
        id: text(100),
        name: text(300),
        scores: z.array(z.number().min(0).max(1000)).max(10),
        result: z.enum(['ผ่าน', 'ไม่ผ่าน', '']),
      })
    )
    .min(1)
    .max(100),
  rubricCriteria: z
    .array(
      z.object({
        id: text(100),
        title: text(300),
        levels: z
          .array(
            z.object({
              level: z.number().int().min(1).max(10),
              label: text(100),
              description: text(2000),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .min(1)
    .max(20),
  passingScore: z.number().min(0).max(10000),
  passingCriteria: text(2000),
  evaluatorName: text(300),
  evaluatorRole: text(200),
  evaluationDate: text(100),
});

const desiredCharacteristicAssessmentAIContentSchema = z.object({
  title: text(300),
  instructions: text(2000),
  characteristicGroups: z
    .array(
      z.object({
        id: text(100),
        title: text(300),
        behaviors: z
          .array(z.object({ id: text(100), title: text(500) }))
          .min(1)
          .max(20),
      })
    )
    .min(1)
    .max(20),
  students: z
    .array(
      z.object({
        id: text(100),
        name: text(300),
        scores: z.array(z.number().int().min(0).max(3)).max(100),
      })
    )
    .min(1)
    .max(100),
  qualityLevels: z
    .array(
      z.object({
        id: text(100),
        minimumScore: z.number().int().min(0).max(1000),
        maximumScore: z.number().int().min(0).max(1000),
        label: text(100),
      })
    )
    .min(1)
    .max(20),
  passingScore: z.number().int().min(0).max(1000),
  passingNote: text(2000),
  evaluatorName: text(300),
  evaluatorRole: text(200),
  evaluationDate: text(100),
});

const competencyAssessmentAIContentSchema = z.object({
  title: text(300),
  instructions: text(2000),
  domains: z
    .array(
      z.object({
        id: text(100),
        title: text(300),
        competencyLabel: text(500),
      })
    )
    .min(1)
    .max(20),
  students: z
    .array(
      z.object({
        id: text(100),
        name: text(300),
        scores: z.array(z.number().int().min(0).max(3)).max(20),
      })
    )
    .min(1)
    .max(100),
  qualityLevels: z
    .array(
      z.object({
        id: text(100),
        score: z.number().int().min(0).max(3),
        label: text(100),
      })
    )
    .min(1)
    .max(4),
  passingScore: z.number().int().min(0).max(3),
  passingNote: text(2000),
  evaluatorName: text(300),
  evaluatorRole: text(200),
  evaluationDate: text(100),
});

const behaviorObservationAIContentSchema = z.object({
  title: text(300),
  instructions: text(2000),
  behaviors: z
    .array(z.object({ id: text(100), title: text(500) }))
    .min(1)
    .max(20),
  students: z
    .array(
      z.object({
        id: text(100),
        name: text(300),
        observations: z.array(z.boolean()).max(20),
      })
    )
    .min(1)
    .max(100),
  passingMinimum: z.number().int().min(0).max(20),
  passingNote: text(2000),
  evaluatorName: text(300),
  evaluatorRole: text(200),
  evaluationDate: text(100),
});

export const AI_CONTENT_SCHEMAS: Record<TemplateType, z.ZodType> = {
  learning_standard: structuredListAIContentSchema,
  learning_objective: learningObjectiveAIContentSchema,
  essential_content: essentialContentAIContentSchema,
  learning_content: learningContentAIContentSchema,
  learning_activity: learningActivityAIContentSchema,
  assessment: assessmentAIContentSchema,
  rubric: rubricAIContentSchema,
  media: mediaAIContentSchema,
  question: questionAIContentSchema,
  reflection: reflectionAIContentSchema,
  worksheet_assessment_record: worksheetAssessmentRecordAIContentSchema,
  competency: structuredListAIContentSchema,
  competency_assessment: competencyAssessmentAIContentSchema,
  behavior_observation: behaviorObservationAIContentSchema,
  desired_characteristic: structuredListAIContentSchema,
  desired_characteristic_assessment: desiredCharacteristicAssessmentAIContentSchema,
  learner_development: structuredListAIContentSchema,
  learning_task: structuredListAIContentSchema,
  lesson_plan: lessonPlanAIContentSchema,
};

const aiMetadataSchema = z.object({
  teachingMethods: z.array(text(100)).max(30),
  bloomLevels: z.array(text(50)).max(20),
  competencyIds: z.array(text(100)).max(100),
  characteristicIds: z.array(text(100)).max(100),
  estimatedMinutes: z.number().int().min(1).max(10000).nullable(),
  keywords: z.array(text(100)).max(50),
  suitableFor: z.array(text(100)).max(50),
});

export function getGenerateTemplateResponseSchema(templateType: TemplateType) {
  return z.object({
    name: text(200),
    description: text(2000),
    content: AI_CONTENT_SCHEMAS[templateType],
    tags: z.array(text(50)).max(30),
    metadata: aiMetadataSchema,
    indicatorIds: z.array(z.uuid()).max(100),
    warnings: z.array(text(500)).max(20),
  });
}

export type RawTemplateAIResponse = {
  name: string;
  description: string;
  content: unknown;
  tags: string[];
  metadata: Record<string, unknown>;
  indicatorIds: string[];
  warnings: string[];
};
