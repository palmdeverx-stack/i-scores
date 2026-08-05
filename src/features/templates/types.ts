import type { CurriculumReference } from 'src/features/curriculum/types';

export type TemplateType =
  | 'learning_standard'
  | 'learning_objective'
  | 'essential_content'
  | 'learning_content'
  | 'learning_activity'
  | 'assessment'
  | 'rubric'
  | 'media'
  | 'question'
  | 'reflection'
  | 'worksheet_assessment_record'
  | 'competency'
  | 'competency_assessment'
  | 'behavior_observation'
  | 'desired_characteristic'
  | 'desired_characteristic_assessment'
  | 'learner_development'
  | 'learning_task'
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

export type LearningObjectiveItem = {
  id: string;
  description?: string;
  domain: 'knowledge' | 'process' | 'attitude';
  behaviorVerb?: string;
  condition?: string;
  expectedResult?: string;
  successCriteria?: string;
};
export type LearningObjectiveContent = {
  objectives?: LearningObjectiveItem[];
  description?: string;
  domain?: 'knowledge' | 'process' | 'attitude';
  behaviorVerb?: string;
  condition?: string;
  expectedResult?: string;
  successCriteria?: string;
};

export type EssentialContent = { content: string; keyConcepts: string[] };
export type LearningContent = {
  topics: Array<{ id: string; title: string; description?: string; order: number }>;
};
export type LearningActivityContent = { items: StructuredTemplateItem[] };
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
  rows?: ObjectiveAssessmentRow[];
};
export type ObjectiveAssessmentRow = {
  objectiveId: string;
  issue: string;
  method: string;
  instrument: string;
  criteria: string;
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
export type MediaItem = {
  id: string;
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
export type MediaContent = Partial<Omit<MediaItem, 'id'>> & { items?: MediaItem[] };
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
  sections?: Array<{ id: string; title: string; placeholder?: string; required?: boolean }>;
  studentCount?: number;
  passedCount?: number;
  passedPercentage?: number;
  notPassedCount?: number;
  notPassedPercentage?: number;
  specialStudents?: string[];
  knowledgeResult?: string;
  processResult?: string;
  attitudeResult?: string;
  problems?: string;
  solutions?: string;
};
export type WorksheetAssessmentRecordContent = {
  title: string;
  topic: string;
  scoreColumns: Array<{ id: string; title: string; maximumScore: number }>;
  students: Array<{ id: string; name: string; scores: number[]; result?: 'ผ่าน' | 'ไม่ผ่าน' | '' }>;
  rubricCriteria: Array<{
    id: string;
    title: string;
    levels: Array<{ level: number; label: string; description: string }>;
  }>;
  passingScore: number;
  passingCriteria: string;
  evaluatorName: string;
  evaluatorRole: string;
  evaluationDate: string;
};
export type DesiredCharacteristicAssessmentContent = {
  title: string;
  instructions: string;
  characteristicGroups: Array<{
    id: string;
    title: string;
    behaviors: Array<{ id: string; title: string }>;
  }>;
  students: Array<{ id: string; name: string; scores: number[] }>;
  qualityLevels: Array<{
    id: string;
    minimumScore: number;
    maximumScore?: number;
    label: string;
  }>;
  passingScore: number;
  passingNote: string;
  evaluatorName: string;
  evaluatorRole: string;
  evaluationDate: string;
};
export type CompetencyAssessmentContent = {
  title: string;
  instructions: string;
  domains: Array<{ id: string; title: string; competencyLabel: string }>;
  students: Array<{ id: string; name: string; scores: number[] }>;
  qualityLevels: Array<{ id: string; score: number; label: string }>;
  passingScore: number;
  passingNote: string;
  evaluatorName: string;
  evaluatorRole: string;
  evaluationDate: string;
};
export type BehaviorObservationContent = {
  title: string;
  instructions: string;
  behaviors: Array<{ id: string; title: string }>;
  students: Array<{ id: string; name: string; observations: boolean[] }>;
  passingMinimum: number;
  passingNote: string;
  evaluatorName: string;
  evaluatorRole: string;
  evaluationDate: string;
};
export type EvaluationStudent = { id: string; name: string };
export type StructuredTemplateItem = {
  id: string;
  code?: string;
  title: string;
  description: string;
};
export type StructuredListContent = { items: StructuredTemplateItem[] };
export type LearningStandardContent = StructuredListContent & {
  milestoneIndicators: StructuredTemplateItem[];
  terminalIndicators: StructuredTemplateItem[];
};
export type SectionTemplateContent =
  | LearningObjectiveContent
  | EssentialContent
  | LearningContent
  | LearningActivityContent
  | AssessmentContent
  | RubricContent
  | MediaContent
  | QuestionContent
  | ReflectionContent
  | WorksheetAssessmentRecordContent
  | DesiredCharacteristicAssessmentContent
  | CompetencyAssessmentContent
  | BehaviorObservationContent
  | StructuredListContent
  | LearningStandardContent;

export type LessonPlanTemplateContent = {
  cover?: LessonPlanTemplateCover;
  evaluationStudents?: EvaluationStudent[];
  sections: Array<{
    id: string;
    sectionType: TemplateType;
    templateId?: string;
    title: string;
    order: number;
    required: boolean;
    enabled?: boolean;
    content?: SectionTemplateContent;
  }>;
  document?: LessonPlanTemplateDocument;
};

export type LessonPlanTemplateCover = {
  logoUrl?: string;
  heading?: string;
  learningArea?: string;
  subjectName?: string;
  subjectCode?: string;
  topic?: string;
  teacherName?: string;
  teachingDate?: string;
  gradeLevel?: string;
  semester?: string;
  durationHours?: number;
  academicYear?: string;
};

export type LessonPlanTemplateDocument = CurriculumReference & {
  sectionOrder?: string[];
  title: string;
  unitNumber: number;
  unitName: string;
  durationPeriods: number;
  startDate?: string;
  endDate?: string;
  learningStandards: string;
  /** @deprecated superseded by milestoneIndicators/terminalIndicators; kept for reading old saved documents */
  indicators?: string;
  milestoneIndicators: string;
  terminalIndicators: string;
  learningObjectives: string;
  essentialContent: string;
  learnerCompetencies: string;
  desiredCharacteristics: string;
  guidingQuestions: string;
  learningActivities: string;
  learningMedia: string;
  assessment: string;
};

export type TemplateContent = SectionTemplateContent | LessonPlanTemplateContent;

export type TemplateOption = Pick<
  LessonTemplate,
  'id' | 'name' | 'template_type' | 'scope' | 'content'
>;

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
  excludeTemplateType?: TemplateType;
  scope?: TemplateScope;
  status?: TemplateStatus;
  gradeLevel?: string;
  subjectId?: string;
  tag?: string;
  ownerId?: string;
  schoolId?: string;
};

export type TemplateCatalogTab = NonNullable<TemplateFilters['tab']>;
export type TemplateTabCounts = Record<TemplateCatalogTab, number>;
