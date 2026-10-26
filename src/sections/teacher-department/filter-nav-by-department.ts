import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

import { hasWorkspacePermission } from 'src/lib/workspace-access';

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
  ['admin.students', 'teacher.students'],
]);

const PERSONAL_WORKSPACE_GROUPS = [
  { subheader: 'พื้นที่ส่วนตัว', paths: [''] },
  {
    subheader: 'เตรียมการสอน',
    paths: [
      '/department-work/academic-year',
      '/subject',
      '/department-work/subject',
      '/department-work/classroom',
      '/classroom/new',
      '/department-work/student',
      '/department-work/enrollment',
      '/enrollment/new',
    ],
  },
  {
    subheader: 'งานสอนประจำวัน',
    paths: ['/assignments', '/lesson-plans', '/timetable', '/students', '/attendance-scan'],
  },
  { subheader: 'เอกสารและการสื่อสาร', paths: ['/announcements', '/grade-results', '/documents'] },
] as const;
const pathKey = (path: string) => path.replace(/^\/(admin|teacher)/, '').replace(/\/$/, '');

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
 * Reorders the licensed personal-workspace menu into the same sequence users
 * follow when preparing and running an academic year. Unknown future package
 * items remain visible in a separate group instead of being dropped.
 */
export function groupPersonalWorkspaceNav(data: NavSectionProps['data']): NavSectionProps['data'] {
  const items = data.flatMap((group) => group.items);
  const byPath = new Map(items.map((item) => [pathKey(item.path), item]));
  const groupedPaths = new Set<string>(PERSONAL_WORKSPACE_GROUPS.flatMap((group) => group.paths));
  const groups: NavSectionProps['data'] = PERSONAL_WORKSPACE_GROUPS.map((group) => ({
    subheader: group.subheader,
    items: group.paths.flatMap((path) => {
      const item = byPath.get(path);
      return item ? [item] : [];
    }),
  })).filter((group) => group.items.length > 0);
  const additionalItems = items.filter((item) => !groupedPaths.has(pathKey(item.path)));
  if (additionalItems.length)
    groups.push({ subheader: 'เครื่องมือเพิ่มเติม', items: additionalItems });
  return groups;
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
  isSchoolDirector = false,
  managePermissions: string[] = []
): NavSectionProps['data'] {
  const hasDepartment = departments.length > 0;
  const isHead = departments.some((department) => department.role_in_department === 'head');

  const filterItems = (
    items: NavItemDataProps[],
    parentPermission?: string,
    parentAccess?: 'view' | 'manage'
  ): NavItemDataProps[] =>
    items.flatMap((original) => {
      const item = {
        ...original,
        requiresDepartmentPermission: original.requiresDepartmentPermission ?? parentPermission,
        permissionAccess: original.permissionAccess ?? parentAccess,
      };
      // Executives use /teacher as an approval workspace. Even when an
      // executive was previously added to a department, do not expose the
      // operational "งานฝ่ายของฉัน" entry.
      if (item.requiresDepartment && (!hasDepartment || isSchoolDirector)) return [];
      if (item.departmentHeadOnly && !isHead) return [];
      if (item.requiresSchoolDirector && !isSchoolDirector) return [];
      if (
        item.allowedRoles &&
        !(Array.isArray(item.allowedRoles) ? item.allowedRoles : [item.allowedRoles]).includes(
          'teacher'
        )
      )
        return [];
      if (
        item.requiresDepartmentPermission &&
        !hasWorkspacePermission(
          {
            role: 'teacher',
            department_permissions: permissions,
            manage_permissions: managePermissions,
          },
          item.requiresDepartmentPermission,
          item.permissionAccess
        )
      )
        return [];

      const permission = item.requiresDepartmentPermission;
      const readOnly =
        permission &&
        /\.(manage|approve|review)$/.test(permission) &&
        !managePermissions.includes(permission);
      const visible = readOnly
        ? {
            ...item,
            caption: item.caption ? `${item.caption} / ดูข้อมูลเท่านั้น` : 'ดูข้อมูลเท่านั้น',
          }
        : item;
      if (!item.children) return [visible];

      const children = filterItems(
        item.children,
        item.requiresDepartmentPermission,
        item.permissionAccess
      );
      if (!children.length) return [];

      return [{ ...visible, children }];
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
  isSchoolDirector = false,
  managePermissions: string[] = []
): NavSectionProps['data'] {
  const filterItems = (
    items: NavItemDataProps[],
    parentPermission?: string,
    parentAccess?: 'view' | 'manage'
  ): NavItemDataProps[] =>
    items.flatMap((original) => {
      const item = {
        ...original,
        requiresDepartmentPermission: original.requiresDepartmentPermission ?? parentPermission,
        permissionAccess: original.permissionAccess ?? parentAccess,
      };
      if (
        item.allowedRoles &&
        !(Array.isArray(item.allowedRoles) ? item.allowedRoles : [item.allowedRoles]).includes(
          'teacher'
        )
      )
        return [];
      if (item.requiresSchoolDirector && !isSchoolDirector) return [];
      if (
        item.requiresDepartmentPermission &&
        !hasWorkspacePermission(
          {
            role: 'teacher',
            department_permissions: permissions,
            manage_permissions: managePermissions,
          },
          item.requiresDepartmentPermission,
          item.permissionAccess
        )
      )
        return [];
      if (item.children) {
        const children = filterItems(
          item.children,
          item.requiresDepartmentPermission,
          item.permissionAccess
        );
        return children.length ? [{ ...item, children }] : [];
      }

      if (item.requiresSchoolDirector && isSchoolDirector && !item.requiresDepartmentPermission)
        return [item];
      if (!item.requiresDepartmentPermission) return [];
      return [item];
    });

  return data
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}
