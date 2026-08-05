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
  ['admin.students', 'teacher.students'],
]);

const PERSONAL_WORKSPACE_GROUPS = [
  {
    subheader: 'พื้นที่ส่วนตัว',
    titles: ['หน้าหลัก'],
  },
  {
    subheader: '1. ตั้งค่าก่อนเริ่มสอน',
    titles: [
      'ปีการศึกษาและภาคเรียน',
      'รายวิชา',
      'ห้องเรียน',
      'สร้างกลุ่มเรียน',
      'นักเรียน',
      'ลงทะเบียนนักเรียน',
    ],
  },
  {
    subheader: '2. งานสอนประจำวัน',
    titles: ['ชั้นเรียนที่สอน', 'แผนการสอน', 'ตารางสอน', 'ผู้เรียน', 'สแกนเช็คชื่อ'],
  },
  {
    subheader: '3. สื่อสารและสรุปผล',
    titles: ['ประกาศ', 'ผลการเรียน', 'เอกสาร'],
  },
] as const;

const PERSONAL_WORKSPACE_CAPTIONS: Record<string, string> = {
  ปีการศึกษาและภาคเรียน: 'ขั้นที่ 1 กำหนดรอบปีและภาคเรียน',
  รายวิชา: 'ขั้นที่ 2 เตรียมข้อมูลรายวิชา',
  ห้องเรียน: 'ขั้นที่ 3 สร้างชั้นเรียน',
  สร้างกลุ่มเรียน: 'ขั้นที่ 3 สร้างชั้นเรียน',
  นักเรียน: 'ขั้นที่ 4 สร้างข้อมูลนักเรียน',
  ลงทะเบียนนักเรียน: 'ขั้นที่ 5 เพิ่มนักเรียนเข้าชั้นเรียน',
};

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
export function groupPersonalWorkspaceNav(
  data: NavSectionProps['data']
): NavSectionProps['data'] {
  const items = data.flatMap((group) => group.items);
  const itemByTitle = new Map(items.map((item) => [item.title, item]));
  const groupedTitles = new Set<string>(
    PERSONAL_WORKSPACE_GROUPS.flatMap((group) => group.titles)
  );

  const groups: NavSectionProps['data'] = PERSONAL_WORKSPACE_GROUPS.map((group) => ({
    subheader: group.subheader,
    items: group.titles.flatMap((title) => {
      const item = itemByTitle.get(title);
      if (!item) return [];

      const caption = PERSONAL_WORKSPACE_CAPTIONS[title];
      return [{ ...item, ...(caption ? { caption } : {}) }];
    }),
  })).filter((group) => group.items.length > 0);

  const additionalItems = items.filter((item) => !groupedTitles.has(item.title));
  if (additionalItems.length) {
    groups.push({ subheader: 'เครื่องมือเพิ่มเติม', items: additionalItems });
  }

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
