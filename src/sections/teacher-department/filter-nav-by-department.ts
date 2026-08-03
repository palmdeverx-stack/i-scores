import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

// ----------------------------------------------------------------------

export type DepartmentMembership = {
  id: string;
  name: string;
  role_in_department: 'head' | 'member';
};

const REDUNDANT_TEACHER_FEATURES = new Map([
  ['admin.subjects', 'teacher.manage_subjects'],
  ['admin.classrooms', 'teacher.manage_classrooms'],
  ['admin.enrollments', 'teacher.manage_enrollments'],
]);

/**
 * Removes creation-only shortcuts when the visible navigation already contains
 * the corresponding management page, which also provides the same create flow.
 */
export function dedupeTeacherNav(data: NavSectionProps['data']): NavSectionProps['data'] {
  const visibleFeatureKeys = new Set<string>();

  const collectFeatureKeys = (items: NavItemDataProps[]) => {
    items.forEach((item) => {
      if (item.featureKey) visibleFeatureKeys.add(item.featureKey);
      if (item.children) collectFeatureKeys(item.children);
    });
  };

  data.forEach((group) => collectFeatureKeys(group.items));

  const redundantFeatureKeys = new Set(
    [...REDUNDANT_TEACHER_FEATURES.entries()]
      .filter(([managementFeature]) => visibleFeatureKeys.has(managementFeature))
      .map(([, shortcutFeature]) => shortcutFeature)
  );

  const filterItems = (items: NavItemDataProps[]): NavItemDataProps[] =>
    items.flatMap((item) => {
      if (item.featureKey && redundantFeatureKeys.has(item.featureKey)) return [];
      if (!item.children) return [item];

      const children = filterItems(item.children);
      return children.length ? [{ ...item, children }] : [];
    });

  return data
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}

/**
 * Filters a nav tree for a teacher viewer: items with no department/permission
 * requirement stay visible by default, items that declare one are only kept
 * if the teacher's own department/permission state satisfies it.
 */
export function filterNavByDepartment(
  data: NavSectionProps['data'],
  departments: DepartmentMembership[],
  permissions: string[] = [],
  isSchoolDirector = false
): NavSectionProps['data'] {
  const hasDepartment = departments.length > 0;
  const isHead = departments.some((department) => department.role_in_department === 'head');

  const filterItems = (items: NavItemDataProps[]): NavItemDataProps[] =>
    items.flatMap((item) => {
      // Executives use /teacher as an approval workspace. Even when an
      // executive was previously added to a department, do not expose the
      // operational "งานฝ่ายของฉัน" entry.
      if (item.requiresDepartment && (!hasDepartment || isSchoolDirector)) return [];
      if (item.departmentHeadOnly && !isHead) return [];
      if (item.requiresSchoolDirector && !isSchoolDirector) return [];
      if (item.requiresDepartmentPermission && !permissions.includes(item.requiresDepartmentPermission)) {
        return [];
      }

      if (!item.children) return [item];

      const children = filterItems(item.children);
      if (!children.length) return [];

      return [{ ...item, children }];
    });

  return data
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}

/**
 * Filters the ADMIN nav tree for a delegated teacher viewer: opposite default
 * from the teacher-nav filter above — items are admin-only (hidden) unless
 * they explicitly declare a `requiresDepartmentPermission` the teacher holds.
 * School admins never go through this filter; they see the admin nav as-is.
 */
export function filterAdminNavForTeacher(
  data: NavSectionProps['data'],
  permissions: string[],
  isSchoolDirector = false
): NavSectionProps['data'] {
  const filterItems = (items: NavItemDataProps[]): NavItemDataProps[] =>
    items.flatMap((item) => {
      if (item.children) {
        const children = filterItems(item.children);
        return children.length ? [{ ...item, children }] : [];
      }

      if (item.requiresSchoolDirector && isSchoolDirector) return [item];
      if (!item.requiresDepartmentPermission) return [];
      return permissions.includes(item.requiresDepartmentPermission) ? [item] : [];
    });

  return data
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}
