import * as z from 'zod';

export const curriculumReferenceShape = {
  curriculumId: z.uuid().nullable(),
  subjectId: z.uuid().nullable(),
  unitId: z.uuid().nullable(),
  gradeLevels: z.array(z.string().trim().min(1).max(100)).max(30),
  indicatorIds: z.array(z.uuid()).max(300),
  learningOutcomeIds: z.array(z.uuid()).max(300),
};

export const curriculumReferenceSchema = z.object(curriculumReferenceShape);
