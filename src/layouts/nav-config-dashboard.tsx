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
  calendar: icon('ic-calendar'),
  dashboard: icon('ic-dashboard'),
  file: icon('ic-file'),
};

// ----------------------------------------------------------------------

/**
 * School admin navigation — manages everything within their own school.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'ภาพรวม',
    items: [
      { title: 'หน้าหลัก', path: paths.admin.root, icon: ICONS.dashboard },
      { title: 'ข้อมูลโรงเรียน', path: paths.admin.school, icon: ICONS.file },
    ],
  },
  {
    subheader: 'โครงสร้างการเรียน',
    items: [
      {
        title: 'ปีการศึกษา',
        path: paths.admin.academicYear.root,
        icon: ICONS.calendar,
      },
      {
        title: 'ห้องเรียน',
        path: paths.admin.classroom.root,
        icon: ICONS.folder,
      },
      {
        title: 'รายวิชา',
        path: paths.admin.subject.root,
        icon: ICONS.course,
      },
    ],
  },
  {
    subheader: 'บุคลากร',
    items: [
      {
        title: 'ผู้ใช้งาน',
        path: paths.admin.user.root,
        icon: ICONS.user,
      },
      {
        title: 'นักเรียน',
        path: paths.admin.student.root,
        icon: ICONS.user,
      },
      {
        title: 'ครูประจำวิชา',
        path: paths.admin.teacherAssignment.root,
        icon: ICONS.user,
      },
      {
        title: 'การลงทะเบียนนักเรียน',
        path: paths.admin.enrollment.root,
        icon: ICONS.user,
      },
    ],
  },
];
