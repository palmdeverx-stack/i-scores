export type CurriculumSubjectScope = 'system' | 'personal' | 'school' | 'public';

export type Curriculum = {
  id: string;
  school_id: string | null;
  owner_id: string | null;
  code: string | null;
  name: string;
  version: string | null;
  curriculum_type: 'core' | 'school' | 'custom';
  scope: CurriculumSubjectScope;
  status: 'draft' | 'published' | 'archived';
};

export type SubjectLearningOutcome = {
  id: string;
  subject_id: string;
  code: string | null;
  description: string;
  sequence: number;
};

export type SubjectLearningUnit = {
  id: string;
  subject_id: string;
  code: string | null;
  name: string;
  description: string | null;
  sequence: number;
  estimated_periods: number | null;
};

export type CurriculumIndicator = {
  id: string;
  subject_id: string;
  code: string;
  description: string;
  learning_standard: string | null;
};

/**
 * Canonical link shared by lesson plans and reusable templates.
 * Text fields in a lesson plan are snapshots; these IDs remain the source link.
 */
export type CurriculumReference = {
  curriculumId: string | null;
  subjectId: string | null;
  unitId: string | null;
  gradeLevels: string[];
  indicatorIds: string[];
  learningOutcomeIds: string[];
};

export type CurriculumSubjectOption = {
  id: string;
  curriculum_id: string | null;
  code: string | null;
  name: string;
  learning_area: string | null;
  grade_levels: string[];
  learning_standard_code: string | null;
  learning_standards: string | null;
  learning_outcomes: string | null;
  indicators: string | null;
  learning_units: string | null;
  scope: CurriculumSubjectScope;
  curriculum_indicators: CurriculumIndicator[];
  curriculum: Curriculum | null;
  learning_outcomes_structured: SubjectLearningOutcome[];
  learning_units_structured: SubjectLearningUnit[];
};

export const EMPTY_CURRICULUM_REFERENCE: CurriculumReference = {
  curriculumId: null,
  subjectId: null,
  unitId: null,
  gradeLevels: [],
  indicatorIds: [],
  learningOutcomeIds: [],
};
