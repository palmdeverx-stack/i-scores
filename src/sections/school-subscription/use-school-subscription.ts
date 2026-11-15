'use client';

import type { NavMainProps } from 'src/layouts/main/nav/types';
import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';
import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

import { useQuery } from '@tanstack/react-query';

import { getSchoolSubscriptionAccess } from './school-subscription-actions';

// ----------------------------------------------------------------------

export function useSchoolSubscription(schoolId?: string | null) {
  return useQuery({
    queryKey: ['school-subscription-access', schoolId],
    queryFn: () => getSchoolSubscriptionAccess(schoolId!),
    enabled: !!schoolId,
    staleTime: 0,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
}

export function filterDashboardNav(
  data: NavSectionProps['data'],
  enabledFeatures: SchoolFeatureKey[]
): NavSectionProps['data'] {
  const enabled = new Set(enabledFeatures);

  const filterItems = (items: NavItemDataProps[]): NavItemDataProps[] =>
    items.flatMap((item) => {
      const role = item.path.startsWith('/admin/')
        ? 'school_admin'
        : item.path.startsWith('/teacher/')
          ? 'teacher'
          : item.path.startsWith('/student/')
            ? 'student'
            : null;
      const feature =
        item.featureKey ?? (role ? requiredFeatureForPath(role, item.path) : undefined);
      if (feature && !enabled.has(feature as SchoolFeatureKey)) return [];

      const licensedItem = feature ? { ...item, featureKey: feature } : item;
      if (!item.children) return [licensedItem];

      const children = filterItems(item.children);
      return children.length ? [{ ...licensedItem, children }] : [];
    });

  return data
    .map((group) => ({
      ...group,
      items: filterItems(group.items),
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
    ['/admin/inventory', 'admin.inventory'],
    ['/admin/master-data/inventory-items', 'admin.inventory'],
    ['/admin/master-data/inventory-categories', 'admin.inventory'],
    ['/admin/master-data/inventory-locations', 'admin.inventory'],
    ['/admin/master-data/inventory-units', 'admin.inventory'],
    ['/admin/work-attendance', 'staff.work_attendance'],
    ['/admin/duty-roster', 'staff.duty_roster'],
    ['/admin/school-holidays', 'admin.school_holidays'],
    ['/admin/school-time-settings', 'admin.school_time_settings'],
    ['/admin/line-notifications', 'admin.line_notifications'],
    ['/admin/master-data/staff-types', 'admin.staff_masters'],
    ['/admin/master-data/prefixes', 'admin.staff_masters'],
    ['/admin/master-data/positions', 'admin.staff_masters'],
    ['/admin/master-data/academic-ranks', 'admin.staff_masters'],
    ['/admin/master-data/employment-statuses', 'admin.staff_masters'],
    ['/admin/master-data/learning-areas', 'admin.subjects'],
    ['/admin/master-data/subject-types', 'admin.subjects'],
    ['/admin/master-data/education-stages', 'admin.subjects'],
    ['/admin/master-data/grade-levels', 'admin.subjects'],
    ['/admin/master-data/activity-types', 'admin.subjects'],
    ['/admin/access-permissions', 'admin.access_permissions'],
    ['/admin/department-permissions', 'admin.access_permissions'],
    ['/admin/department', 'admin.departments'],
    ['/admin/schedule-submissions', 'academic.schedule_workflow'],
    ['/admin/schedule-approvals', 'academic.schedule_workflow'],
    ['/admin/schedule-builder', 'academic.schedule_workflow'],
    ['/admin/grade-results', 'academic.grade_workflow'],
    ['/admin/grade-reviews', 'academic.grade_workflow'],
    ['/admin/documents', 'academic.documents'],
    ['/admin/teacher-assignment', 'admin.teacher_assignments'],
    ['/admin/lesson-plan-reviews', 'teacher.lesson_plans'],
    ['/admin/academic-year', 'admin.academic_years'],
    ['/admin/enrollment', 'admin.enrollments'],
    ['/admin/classroom', 'admin.classrooms'],
    ['/admin/subject', 'admin.subjects'],
    ['/admin/student', 'admin.students'],
    ['/admin/user', 'admin.staff'],
    ['/admin/school', 'admin.school_profile'],
    ['/admin/announcements', 'admin.announcements'],
    ['/admin/gradebook', 'admin.teacher_assignments'],
  ],
  teacher: [
    ['/teacher/master-data/staff-types', 'admin.staff_masters'],
    ['/teacher/master-data/prefixes', 'admin.staff_masters'],
    ['/teacher/master-data/positions', 'admin.staff_masters'],
    ['/teacher/master-data/academic-ranks', 'admin.staff_masters'],
    ['/teacher/master-data/employment-statuses', 'admin.staff_masters'],
    ['/teacher/master-data/learning-areas', 'admin.subjects'],
    ['/teacher/master-data/subject-types', 'admin.subjects'],
    ['/teacher/master-data/education-stages', 'admin.subjects'],
    ['/teacher/master-data/grade-levels', 'admin.subjects'],
    ['/teacher/master-data/activity-types', 'admin.subjects'],
    ['/teacher/inventory', 'admin.inventory'],
    ['/teacher/master-data/inventory-items', 'admin.inventory'],
    ['/teacher/master-data/inventory-categories', 'admin.inventory'],
    ['/teacher/master-data/inventory-locations', 'admin.inventory'],
    ['/teacher/master-data/inventory-units', 'admin.inventory'],
    ['/teacher/work-attendance', 'staff.work_attendance'],
    ['/teacher/duty-roster', 'staff.duty_roster'],
    ['/teacher/department-work/academic-year', 'admin.academic_years'],
    ['/teacher/department-work/classroom', 'admin.classrooms'],
    ['/teacher/department-work/subject', 'admin.subjects'],
    ['/teacher/department-work/enrollment', 'admin.enrollments'],
    ['/teacher/department-work/announcements', 'admin.announcements'],
    ['/teacher/department-work/student', 'admin.students'],
    ['/teacher/department-work/user', 'admin.staff'],
    ['/teacher/department', 'admin.departments'],
    ['/teacher/school', 'admin.school_profile'],
    ['/teacher/schedule-submissions', 'academic.schedule_workflow'],
    ['/teacher/schedule-approvals', 'academic.schedule_workflow'],
    ['/teacher/schedule-builder', 'academic.schedule_workflow'],
    ['/teacher/grade-results', 'academic.grade_workflow'],
    ['/teacher/grade-reviews', 'academic.grade_workflow'],
    ['/teacher/documents', 'academic.documents'],
    ['/teacher/attendance-scan', 'teacher.qr_attendance'],
    ['/teacher/lesson-plan-reviews', 'teacher.lesson_plans'],
    ['/teacher/lesson-plans', 'teacher.lesson_plans'],
    ['/teacher/subject', 'teacher.manage_subjects'],
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
    ['/student/timetable', 'student.subjects'],
    ['/student/subjects', 'student.subjects'],
    ['/student/classroom', 'student.subjects'],
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
