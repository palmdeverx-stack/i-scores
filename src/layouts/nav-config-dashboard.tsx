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
  RiMegaphoneLine,
  RiDashboardLine,
  RiPresentationLine,
  RiGraduationCapLine,
  RiOrganizationChart,
  RiCalendarScheduleLine,
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
  announcements: <RiMegaphoneLine />,
  department: <RiOrganizationChart />,
  scheduleBuilder: <RiCalendarScheduleLine />,
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
        title: 'ประกาศ',
        path: paths.admin.announcements,
        icon: ICONS.announcements,
        requiresDepartmentPermission: 'announcements.manage',
      },
      {
        title: 'แจ้งเตือน LINE',
        path: paths.admin.lineNotifications,
        icon: ICONS.lineNotifications,
        featureKey: 'admin.line_notifications',
      },
      {
        title: 'ข้อมูลโรงเรียน',
        path: paths.admin.school,
        icon: ICONS.school,
        featureKey: 'admin.school_profile',
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
        requiresDepartmentPermission: 'academic_years.manage',
      },
      {
        title: 'ห้องเรียน',
        path: paths.admin.classroom.root,
        icon: ICONS.classroom,
        featureKey: 'admin.classrooms',
        requiresDepartmentPermission: 'classrooms.manage',
      },
      {
        title: 'รายวิชา',
        path: paths.admin.subject.root,
        icon: ICONS.subject,
        featureKey: 'admin.subjects',
        requiresDepartmentPermission: 'subjects.manage',
      },
      {
        title: 'ลงทะเบียนนักเรียน',
        path: paths.admin.enrollment.root,
        icon: ICONS.enrollment,
        featureKey: 'admin.enrollments',
        requiresDepartmentPermission: 'enrollments.manage',
      },
    ],
  },
  {
    subheader: 'การเรียนการสอน',
    items: [
      {
        title: 'ครูประจำวิชา',
        path: paths.admin.teacherAssignment.root,
        icon: ICONS.teacherAssignment,
        featureKey: 'admin.teacher_assignments',
        requiresDepartmentPermission: 'schedule.manage',
      },
      {
        title: 'จัดตารางสอน',
        path: paths.admin.scheduleBuilder,
        icon: ICONS.scheduleBuilder,
        requiresDepartmentPermission: 'schedule.manage',
      },
    ],
  },
  {
    subheader: 'บุคลากรและนักเรียน',
    items: [
      {
        title: 'ครู/บุคลากร',
        path: paths.admin.user.root,
        icon: ICONS.staff,
        featureKey: 'admin.staff',
        requiresDepartmentPermission: 'staff.manage',
      },
      {
        title: 'จัดการฝ่าย',
        path: '#',
        icon: ICONS.department,
        children: [
          {
            title: 'รายการฝ่าย',
            path: paths.admin.department.root,
            deepMatch: true,
          },
          {
            title: 'จัดการสิทธิ์เข้าใช้งาน',
            path: paths.admin.department.permissions,
          },
        ],
      },
      {
        title: 'นักเรียน',
        path: paths.admin.student.root,
        icon: ICONS.student,
        featureKey: 'admin.students',
        requiresDepartmentPermission: 'students.manage',
      },
    ],
  },
];
