import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  user: icon('ic-user'),
  course: icon('ic-course'),
  folder: icon('ic-folder'),
  dashboard: icon('ic-dashboard'),
  calendar: icon('ic-calendar'),
};

// ----------------------------------------------------------------------

/**
 * Teacher navigation — scoped to the subjects/classrooms they're assigned to.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'ภาพรวม',
    items: [
      { title: 'หน้าหลัก', path: paths.teacher.root, icon: ICONS.dashboard },
      {
        title: 'วิชาที่สอน',
        path: paths.teacher.assignments,
        icon: ICONS.course,
      },
      {
        title: 'ตารางสอน',
        path: paths.teacher.timetable,
        icon: ICONS.calendar,
      },
      {
        title: 'เพิ่มห้องเรียน',
        path: paths.teacher.classroomNew,
        icon: ICONS.folder,
      },
      {
        title: 'เพิ่มนักเรียน',
        path: paths.teacher.enrollmentNew,
        icon: ICONS.user,
      },
    ],
  },
];
