import type { CurriculumReference } from 'src/features/curriculum/types';

export type TemplateType =
  | 'learning_objective'
  | 'essential_content'
  | 'learning_content'
  | 'learning_activity'
  | 'assessment'
  | 'rubric'
  | 'media'
  | 'question'
  | 'reflection'
  | 'lesson_plan';

export type TemplateScope = 'personal' | 'school' | 'system' | 'marketplace';
export type TemplateStatus = 'draft' | 'active' | 'archived';

export type TemplateMetadata = {
  teachingMethods?: string[];
  bloomLevels?: string[];
  competencyIds?: string[];
  characteristicIds?: string[];
  estimatedMinutes?: number;
  keywords?: string[];
  suitableFor?: string[];
};

export type LearningObjectiveContent = {
  description: string;
  domain: 'knowledge' | 'process' | 'attitude';
  behaviorVerb?: string;
  condition?: string;
  expectedResult?: string;
  successCriteria?: string;
};

export type EssentialContent = { content: string; keyConcepts: string[] };
export type LearningContent = {
  topics: Array<{ id: string; title: string; description?: string; order: number }>;
};
export type LearningActivityContent = {
  activityName: string;
  teachingMethod?: string;
  phase: 'introduction' | 'learning' | 'practice' | 'conclusion';
  durationMinutes?: number;
  objectives: string[];
  teacherActions: string[];
  studentActions: string[];
  requiredMaterials: string[];
  expectedOutputs: string[];
  groupType?: 'individual' | 'pair' | 'group' | 'whole_class';
};
export type AssessmentContent = {
  assessmentType:
    | 'test'
    | 'worksheet'
    | 'observation'
    | 'performance'
    | 'project'
    | 'presentation'
    | 'interview'
    | 'portfolio';
  method: string;
  instrument: string;
  evidence: string;
  criteria: string;
  passingScore?: number;
  maximumScore?: number;
};
export type RubricContent = {
  rubricType: 'analytic' | 'holistic' | 'checklist' | 'rating_scale';
  scoreType: 'score' | 'percentage' | 'level';
  maximumScore?: number;
  passingScore?: number;
  criteria: Array<{
    id: string;
    name: string;
    description?: string;
    weight?: number;
    levels: Array<{
      id: string;
      level: number;
      label: string;
      score: number;
      description: string;
    }>;
  }>;
};
export type MediaContent = {
  mediaType:
    | 'worksheet'
    | 'slide'
    | 'video'
    | 'website'
    | 'book'
    | 'game'
    | 'quiz'
    | 'equipment'
    | 'other';
  title: string;
  description?: string;
  url?: string;
  marketplaceProductId?: string;
  usageInstructions?: string;
};
export type QuestionContent = {
  questions: Array<{
    id: string;
    question: string;
    bloomLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
    expectedAnswer?: string;
    followUpQuestions?: string[];
  }>;
};
export type ReflectionContent = {
  sections: Array<{ id: string; title: string; placeholder?: string; required?: boolean }>;
};
export type LessonPlanTemplateContent = {
  sections: Array<{
    id: string;
    sectionType: TemplateType;
    templateId?: string;
    title: string;
    order: number;
    required: boolean;
  }>;
};

export type TemplateContent =
  | LearningObjectiveContent
  | EssentialContent
  | LearningContent
  | LearningActivityContent
  | AssessmentContent
  | RubricContent
  | MediaContent
  | QuestionContent
  | ReflectionContent
  | LessonPlanTemplateContent;

export type LessonTemplate = {
  id: string;
  owner_id: string;
  school_id: string | null;
  name: string;
  description: string | null;
  template_type: TemplateType;
  scope: TemplateScope;
  status: TemplateStatus;
  content: TemplateContent;
  metadata: TemplateMetadata;
  tags: string[];
  curriculum_id: string | null;
  subject_id: string | null;
  unit_id: string | null;
  course_id: string | null;
  grade_levels: string[];
  indicator_ids: string[];
  learning_outcome_ids: string[];
  source_template_id: string | null;
  version: number;
  usage_count: number;
  is_ai_generated: boolean;
  ai_provider: 'openai' | null;
  ai_model: string | null;
  ai_generated_at: string | null;
  ai_action: string | null;
  ai_request_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  owner?: { id: string; first_name: string | null; last_name: string | null } | null;
  subject?: { id: string; code: string | null; name: string } | null;
  can_edit?: boolean;
};

export type TemplateInput = CurriculumReference & {
  name: string;
  description?: string;
  templateType: TemplateType;
  scope: 'personal' | 'school';
  status: TemplateStatus;
  content: TemplateContent;
  metadata?: TemplateMetadata;
  tags?: string[];
  courseId?: string | null;
  aiGeneration?: {
    isAIGenerated: boolean;
    aiProvider?: 'openai';
    aiModel?: string;
    aiGeneratedAt?: string;
    aiAction?:
      | 'generate'
      | 'improve'
      | 'rewrite'
      | 'shorten'
      | 'expand'
      | 'regenerate'
      | 'suggest_tags'
      | 'suggest_metadata';
    aiRequestId?: string;
  };
};

export type TemplateFilters = {
  search?: string;
  tab?: 'all' | 'mine' | 'school' | 'system' | 'marketplace';
  templateType?: TemplateType;
  scope?: TemplateScope;
  status?: TemplateStatus;
  gradeLevel?: string;
  subjectId?: string;
  tag?: string;
  ownerId?: string;
  schoolId?: string;
};
