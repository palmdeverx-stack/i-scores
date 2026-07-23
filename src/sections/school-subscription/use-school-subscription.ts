'use client';

import type { NavMainProps } from 'src/layouts/main/nav/types';
import type { NavSectionProps } from 'src/components/nav-section';
import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';

import { useQuery } from '@tanstack/react-query';

import { getSchoolSubscription } from './school-subscription-actions';

// ----------------------------------------------------------------------

export function useSchoolSubscription(schoolId?: string | null) {
  return useQuery({
    queryKey: ['school-subscription', schoolId],
    queryFn: () => getSchoolSubscription(schoolId!),
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

export function filterDashboardNav(
  data: NavSectionProps['data'],
  enabledFeatures: SchoolFeatureKey[]
): NavSectionProps['data'] {
  const enabled = new Set(enabledFeatures);
  return data
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.featureKey || enabled.has(item.featureKey as SchoolFeatureKey)
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterMainNav(
  data: NavMainProps['data'],
  enabledFeatures: SchoolFeatureKey[]
): NavMainProps['data'] {
  const enabled = new Set(enabledFeatures);
  return data.filter(
    (item) => !item.featureKey || enabled.has(item.featureKey as SchoolFeatureKey)
  );
}

const ROUTE_FEATURES: Record<
  'school_admin' | 'teacher' | 'student',
  Array<[string, SchoolFeatureKey]>
> = {
  school_admin: [
    ['/admin/teacher-assignment', 'admin.teacher_assignments'],
    ['/admin/academic-year', 'admin.academic_years'],
    ['/admin/enrollment', 'admin.enrollments'],
    ['/admin/classroom', 'admin.classrooms'],
    ['/admin/subject', 'admin.subjects'],
    ['/admin/student', 'admin.students'],
    ['/admin/user', 'admin.staff'],
    ['/admin/school', 'admin.school_profile'],
  ],
  teacher: [
    ['/teacher/attendance-scan', 'teacher.qr_attendance'],
    ['/teacher/enrollment', 'teacher.manage_enrollments'],
    ['/teacher/classroom', 'teacher.manage_classrooms'],
    ['/teacher/announcements', 'teacher.announcements'],
    ['/teacher/assignments', 'teacher.assignments'],
    ['/teacher/gradebook', 'teacher.assignments'],
    ['/teacher/students', 'teacher.students'],
    ['/teacher/timetable', 'teacher.timetable'],
  ],
  student: [
    ['/student/assignments', 'student.assignments'],
    ['/student/attendance', 'student.attendance'],
    ['/student/subjects', 'student.subjects'],
    ['/student/qr', 'student.qr'],
  ],
};

export function requiredFeatureForPath(
  role: 'school_admin' | 'teacher' | 'student',
  pathname: string
) {
  return ROUTE_FEATURES[role].find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.[1];
}
