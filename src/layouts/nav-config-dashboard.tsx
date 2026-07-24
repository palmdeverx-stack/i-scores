import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiTeamLine,
  RiBook2Line,
  RiSchoolLine,
  RiUserAddLine,
  RiCalendarLine,
  RiUserStarLine,
  RiMessage2Line,
  RiDashboardLine,
  RiPresentationLine,
  RiGraduationCapLine,
} from 'src/components/remix-icon';

// ----------------------------------------------------------------------

const ICONS = {
  dashboard: <RiDashboardLine />,
  school: <RiSchoolLine />,
  academicYear: <RiCalendarLine />,
  classroom: <RiPresentationLine />,
  subject: <RiBook2Line />,
  staff: <RiTeamLine />,
  student: <RiGraduationCapLine />,
  teacherAssignment: <RiUserStarLine />,
  enrollment: <RiUserAddLine />,
  lineNotifications: <RiMessage2Line />,
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
      {
        title: 'ข้อมูลโรงเรียน',
        path: paths.admin.school,
        icon: ICONS.school,
        featureKey: 'admin.school_profile',
      },
      {
        title: 'แจ้งเตือน LINE',
        path: paths.admin.lineNotifications,
        icon: ICONS.lineNotifications,
        featureKey: 'admin.line_notifications',
      },
    ],
  },
  {
    subheader: 'โครงสร้างการเรียน',
    items: [
      {
        title: 'ปีการศึกษา',
        path: paths.admin.academicYear.root,
        icon: ICONS.academicYear,
        featureKey: 'admin.academic_years',
      },
      {
        title: 'ห้องเรียน',
        path: paths.admin.classroom.root,
        icon: ICONS.classroom,
        featureKey: 'admin.classrooms',
      },
      {
        title: 'รายวิชา',
        path: paths.admin.subject.root,
        icon: ICONS.subject,
        featureKey: 'admin.subjects',
      },
    ],
  },
  {
    subheader: 'บุคลากร',
    items: [
      {
        title: 'ครู/บุคลากร',
        path: paths.admin.user.root,
        icon: ICONS.staff,
        featureKey: 'admin.staff',
      },
      {
        title: 'นักเรียน',
        path: paths.admin.student.root,
        icon: ICONS.student,
        featureKey: 'admin.students',
      },
      {
        title: 'ครูประจำวิชา',
        path: paths.admin.teacherAssignment.root,
        icon: ICONS.teacherAssignment,
        featureKey: 'admin.teacher_assignments',
      },
      {
        title: 'ลงทะเบียนนักเรียน',
        path: paths.admin.enrollment.root,
        icon: ICONS.enrollment,
        featureKey: 'admin.enrollments',
      },
    ],
  },
];
