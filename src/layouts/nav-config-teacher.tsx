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
  mail: icon('ic-mail'),
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
        deepMatch: true,
        featureKey: 'teacher.assignments',
      },
      {
        title: 'นักเรียนของฉัน',
        path: paths.teacher.students,
        icon: ICONS.user,
        deepMatch: true,
        featureKey: 'teacher.students',
      },
      {
        title: 'สแกนเช็คชื่อ',
        path: paths.teacher.attendanceScan,
        icon: ICONS.calendar,
        deepMatch: true,
        featureKey: 'teacher.qr_attendance',
      },
      {
        title: 'ตารางสอน',
        path: paths.teacher.timetable,
        icon: ICONS.calendar,
        featureKey: 'teacher.timetable',
      },
      {
        title: 'ประกาศ',
        path: paths.teacher.announcements,
        icon: ICONS.mail,
        featureKey: 'teacher.announcements',
      },
      {
        title: 'เพิ่มห้องเรียน',
        path: paths.teacher.classroomNew,
        icon: ICONS.folder,
        featureKey: 'teacher.manage_classrooms',
      },
      {
        title: 'เพิ่มนักเรียน',
        path: paths.teacher.enrollmentNew,
        icon: ICONS.user,
        featureKey: 'teacher.manage_enrollments',
      },
    ],
  },
];
