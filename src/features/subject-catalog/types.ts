import type {
  Curriculum,
  CurriculumIndicator,
  SubjectLearningUnit,
  CurriculumSubjectScope,
  SubjectLearningOutcome,
} from 'src/features/curriculum/types';

export type SubjectCatalogScope = CurriculumSubjectScope;
export type SubjectCatalogIndicator = CurriculumIndicator;

export type SubjectCatalogEntry = {
  id: string;
  curriculum_id: string | null;
  school_id: string | null;
  created_by: string | null;
  code: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  learning_area: string | null;
  subject_type: string | null;
  education_stage: string | null;
  grade_levels: string[];
  learning_standard_code: string | null;
  learning_standards: string | null;
  learning_outcomes: string | null;
  learning_units: string | null;
  indicator_text: string | null;
  scope: SubjectCatalogScope;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  indicators: SubjectCatalogIndicator[];
  curriculum: Curriculum | null;
  learning_outcomes_structured: SubjectLearningOutcome[];
  learning_units_structured: SubjectLearningUnit[];
  can_edit: boolean;
};
