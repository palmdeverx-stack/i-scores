'use client';

// ----------------------------------------------------------------------

export type GuardianStudentProfile = {
  id: string;
  name_prefix: string | null;
  first_name: string | null;
  last_name: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  nickname: string | null;
  avatar_url: string | null;
  student_status: 'studying' | 'graduated' | 'transferred' | 'withdrawn' | 'dismissed' | null;
  student_code: string | null;
  birth_date: string | null;
  gender: 'male' | 'female' | 'other' | 'unspecified' | null;
  nationality: string | null;
  religion: string | null;
  guardian: { fullName: string; relationship: string } | null;
  enrollment: {
    student_number: string | null;
    classroom:
      | {
          id: string;
          name: string;
          grade_level: string | null;
          academic_year: { year: string; is_active: boolean } | null;
        }
      | Array<{
          id: string;
          name: string;
          grade_level: string | null;
          academic_year: { year: string; is_active: boolean } | null;
        }>
      | null;
  } | null;
};

export type GuardianProfileResponse = {
  school: { id: string; name: string; code: string; logo_url: string | null } | null;
  students: GuardianStudentProfile[];
};

export async function getGuardianProfile(): Promise<GuardianProfileResponse> {
  const response = await fetch('/api/guardian/profile', { credentials: 'same-origin' });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.message ?? 'ไม่สามารถโหลดข้อมูลนักเรียนได้');
  }
  return json;
}
