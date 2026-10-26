import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

const GROUPS = [
  'ภาพรวม',
  'งานของฉัน',
  'งานสอนและชั้นเรียน',
  'งานตรวจสอบและอนุมัติ',
  'งานวิชาการ',
  'งานพัสดุ',
  'งานเอกสาร',
  'บุคลากรและนักเรียน',
  'ประกาศและการสื่อสาร',
  'ข้อมูลหลัก',
  'ตั้งค่าโรงเรียนและสิทธิ์',
  'เครื่องมือเพิ่มเติม',
] as const;

const TITLES: Record<string, string> = {
  '/lesson-plan-reviews': 'พิจารณาแผนการสอน',
  '/schedule-approvals': 'พิจารณาตารางสอน',
  '/grade-reviews': 'ตรวจสอบผลการเรียนรายชั้นปี',
  '/grade-results': 'ตรวจรับและติดตามผลการเรียน',
  '/schedule-submissions': 'ติดตามการลงนามตารางสอน',
  '/teacher-assignment': 'มอบหมายครูผู้สอน',
  '/enrollment': 'จัดนักเรียนเข้าห้องเรียน',
  '/academic-year': 'ปีการศึกษาและภาคเรียน',
  '/department-work/enrollment': 'จัดนักเรียนเข้าห้องเรียน',
  '/department-work/academic-year': 'ปีการศึกษาและภาคเรียน',
  '/department': 'งานฝ่ายที่ได้รับมอบหมาย',
  '/documents/templates': 'แม่แบบและตัวอย่างเอกสาร',
  '/access-permissions': 'สิทธิ์ตามประเภทบุคลากรและรายบุคคล',
  '/line-notifications': 'ตั้งค่าการแจ้งเตือน LINE',
  '/licenses': 'แพ็กเกจและสิทธิ์โรงเรียน',
  '/master-data/inventory-items': 'รายการพัสดุ',
  '/master-data/inventory-locations': 'สถานที่จัดเก็บ',
};
export const navigationPathKey = (path: string) =>
  path.replace(/^\/(admin|teacher)/, '').replace(/\/$/, '');
function groupFor(
  item: NavItemDataProps,
  role: 'teacher' | 'school_admin'
): (typeof GROUPS)[number] {
  const path = navigationPathKey(item.path);
  if (!path) return 'ภาพรวม';
  if (
    [
      '/lesson-plan-reviews',
      '/schedule-approvals',
      '/grade-reviews',
      '/inventory/approvals',
      '/inventory/purchase-approvals',
    ].includes(path)
  )
    return 'งานตรวจสอบและอนุมัติ';
  if (path.startsWith('/master-data') || item.path === '#') return 'ข้อมูลหลัก';
  if (path.startsWith('/inventory')) return 'งานพัสดุ';
  if (path.startsWith('/documents')) return 'งานเอกสาร';
  if (
    [
      '/school',
      '/licenses',
      '/school-time-settings',
      '/access-permissions',
      '/department-permissions',
    ].includes(path) ||
    (role === 'school_admin' && path === '/department')
  )
    return 'ตั้งค่าโรงเรียนและสิทธิ์';
  if (path.includes('announcements') || ['/line-notifications', '/school-holidays'].includes(path))
    return 'ประกาศและการสื่อสาร';
  if (role === 'teacher' && ['/department', '/work-attendance', '/duty-roster'].includes(path))
    return 'งานของฉัน';
  if (
    role === 'teacher' &&
    [
      '/assignments',
      '/students',
      '/attendance-scan',
      '/timetable',
      '/lesson-plans',
      '/subject',
      '/classroom/new',
      '/enrollment/new',
    ].includes(path)
  )
    return 'งานสอนและชั้นเรียน';
  if (
    [
      '/user',
      '/student',
      '/work-attendance',
      '/duty-roster',
      '/department-work/user',
      '/department-work/student',
    ].includes(path)
  )
    return 'บุคลากรและนักเรียน';
  if (
    path.startsWith('/department-work') ||
    [
      '/academic-year',
      '/classroom',
      '/subject',
      '/enrollment',
      '/teacher-assignment',
      '/schedule-builder',
      '/schedule-submissions',
      '/grade-results',
    ].includes(path)
  )
    return 'งานวิชาการ';
  return 'เครื่องมือเพิ่มเติม';
}

/** Presentation only: preserves paths, entitlements and inherited permissions. */
export function organizeSchoolNavigation(
  data: NavSectionProps['data'],
  role: 'teacher' | 'school_admin'
): NavSectionProps['data'] {
  const decorate = (item: NavItemDataProps, parentPermission?: string): NavItemDataProps => {
    const path = navigationPathKey(item.path);
    const permission = item.requiresDepartmentPermission ?? parentPermission;
    return {
      ...item,
      title:
        item.children && path.startsWith('/master-data')
          ? path.includes('/inventory-')
            ? 'ข้อมูลหลักพัสดุ'
            : item.title
          : role === 'school_admin' && path === '/department'
            ? 'ฝ่ายงานและผู้รับผิดชอบ'
            : (TITLES[path] ?? item.title),
      ...(permission ? { requiresDepartmentPermission: permission } : {}),
      ...(role === 'school_admin' && ((!permission && !item.children) || path === '/student/import')
        ? { allowedRoles: ['school_admin'] }
        : {}),
      ...(permission && /\/(new|edit)$/.test(path) && permission.endsWith('.manage')
        ? { permissionAccess: 'manage' as const }
        : {}),
      ...(role === 'school_admin' && path === '/schedule-approvals'
        ? { requiresDepartmentPermission: 'schedule.approve', requiresSchoolDirector: false }
        : {}),
      ...(role === 'teacher' && path === '/school'
        ? { requiresDepartmentPermission: 'school_profile.view' }
        : {}),
      ...(item.children
        ? { children: item.children.map((child) => decorate(child, permission)) }
        : {}),
    };
  };
  const grouped = new Map<string, NavItemDataProps[]>();
  const items = data
    .flatMap((section) => section.items)
    .flatMap((item) => {
      if (item.path !== '#' || !item.children) return [item];
      const domains = [
        {
          title: 'ข้อมูลหลักพัสดุ',
          matches: (child: NavItemDataProps) => child.path.includes('/inventory-'),
        },
        {
          title: 'ข้อมูลหลักบุคลากร',
          matches: (child: NavItemDataProps) => child.featureKey === 'admin.staff_masters',
        },
        {
          title: 'ข้อมูลหลักวิชาการ',
          matches: (child: NavItemDataProps) =>
            !child.path.includes('/inventory-') && child.featureKey !== 'admin.staff_masters',
        },
      ];
      return domains.flatMap((domain) => {
        const children = item.children!.filter(domain.matches);
        return children.length
          ? [{ ...item, title: domain.title, path: children[0].path, deepMatch: false, children }]
          : [];
      });
    });
  for (const item of items) {
    const group = groupFor(item, role);
    grouped.set(group, [...(grouped.get(group) ?? []), decorate(item)]);
  }
  return GROUPS.flatMap((subheader) => {
    const groupItems = grouped.get(subheader);
    return groupItems?.length ? [{ subheader, items: groupItems }] : [];
  });
}

export function organizeMasterNavigation(data: NavSectionProps['data']): NavSectionProps['data'] {
  const groups = [
    'ภาพรวมระบบ',
    'ดูแลโรงเรียนและบัญชี',
    'แพ็กเกจและบริการ',
    'ตั้งค่าระบบ',
    'เอกสารและคู่มือ',
  ];
  const bucket = new Map<string, NavItemDataProps[]>();
  for (const item of data.flatMap((group) => group.items)) {
    const path = item.path;
    const group =
      path.endsWith('/master') || path.includes('system-quality')
        ? groups[0]
        : path.includes('school')
          ? groups[1]
          : path.includes('subscription') || path.endsWith('/apps')
            ? groups[2]
            : path.includes('system-flow')
              ? groups[4]
              : groups[3];
    bucket.set(group, [...(bucket.get(group) ?? []), { ...item, allowedRoles: ['master_admin'] }]);
  }
  return groups.flatMap((subheader) =>
    bucket.get(subheader)?.length ? [{ subheader, items: bucket.get(subheader)! }] : []
  );
}
