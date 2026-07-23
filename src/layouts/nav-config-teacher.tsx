import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiBook2Line,
  RiGroupLine,
  RiQrScan2Line,
  RiUserAddLine,
  RiBookOpenLine,
  RiDashboardLine,
  RiMegaphoneLine,
  RiSettings3Line,
  RiPresentationLine,
  RiCalendarScheduleLine,
} from 'src/components/remix-icon';

// ----------------------------------------------------------------------

const ICONS = {
  dashboard: <RiDashboardLine />,
  assignments: <RiBookOpenLine />,
  students: <RiGroupLine />,
  attendance: <RiQrScan2Line />,
  timetable: <RiCalendarScheduleLine />,
  announcements: <RiMegaphoneLine />,
  manage: <RiSettings3Line />,
  subject: <RiBook2Line />,
  classroom: <RiPresentationLine />,
  studentAdd: <RiUserAddLine />,
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
        icon: ICONS.assignments,
        deepMatch: true,
        featureKey: 'teacher.assignments',
      },
      {
        title: 'นักเรียนของฉัน',
        path: paths.teacher.students,
        icon: ICONS.students,
        deepMatch: true,
        featureKey: 'teacher.students',
      },
      {
        title: 'สแกนเช็คชื่อ',
        path: paths.teacher.attendanceScan,
        icon: ICONS.attendance,
        deepMatch: true,
        featureKey: 'teacher.qr_attendance',
      },
      {
        title: 'ตารางสอน',
        path: paths.teacher.timetable,
        icon: ICONS.timetable,
        featureKey: 'teacher.timetable',
      },
      {
        title: 'ประกาศ',
        path: paths.teacher.announcements,
        icon: ICONS.announcements,
        featureKey: 'teacher.announcements',
      },
      {
        title: 'จัดการข้อมูล',
        path: '#',
        icon: ICONS.manage,
        children: [
          {
            title: 'เพิ่มรายวิชา',
            path: paths.teacher.subjectNew,
            icon: ICONS.subject,
            featureKey: 'teacher.manage_subjects',
          },
          {
            title: 'เพิ่มห้องเรียน',
            path: paths.teacher.classroomNew,
            icon: ICONS.classroom,
            featureKey: 'teacher.manage_classrooms',
          },
          {
            title: 'เพิ่มนักเรียน',
            path: paths.teacher.enrollmentNew,
            icon: ICONS.studentAdd,
            featureKey: 'teacher.manage_enrollments',
          },
        ],
      },
    ],
  },
];
