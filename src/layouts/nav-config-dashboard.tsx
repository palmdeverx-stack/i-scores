import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiTeamLine,
  RiBook2Line,
  RiIdCardLine,
  RiSchoolLine,
  RiUserAddLine,
  RiCalendarLine,
  RiUserStarLine,
  RiMessage2Line,
  RiFileChartLine,
  RiFileList3Line,
  RiMegaphoneLine,
  RiDashboardLine,
  RiSettings3Line,
  RiFileSearchLine,
  RiFileHistoryLine,
  RiShieldCheckLine,
  RiPresentationLine,
  RiCalendarCheckLine,
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
  scheduleSubmissions: <RiFileHistoryLine />,
  scheduleApprovals: <RiCalendarCheckLine />,
  gradeReviews: <RiFileSearchLine />,
  gradeResults: <RiFileChartLine />,
  documents: <RiFileList3Line />,
  accessPermissions: <RiShieldCheckLine />,
  staffMasters: <RiSettings3Line />,
  staffTypes: <RiTeamLine />,
  positions: <RiIdCardLine />,
  academicRanks: <RiUserStarLine />,
};

// ----------------------------------------------------------------------

/**
 * School admin navigation — manages everything within their own school.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'ภาพรวม',
    items: [
      {
        title: 'หน้าหลัก',
        path: paths.admin.root,
        icon: ICONS.dashboard,
        requiresDepartmentPermission: 'dashboard.view',
      },
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
        requiresDepartmentPermission: 'school_profile.view',
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
      {
        title: 'สถานะการลงนามตารางสอน',
        path: paths.admin.scheduleSubmissions,
        icon: ICONS.scheduleSubmissions,
        requiresDepartmentPermission: 'schedule.manage',
      },
      {
        title: 'ตรวจสอบผลการเรียน',
        path: paths.admin.gradeReviews,
        icon: ICONS.gradeReviews,
        requiresDepartmentPermission: 'grades.approve',
      },
      {
        title: 'ผลการเรียน',
        path: paths.admin.gradeResults,
        icon: ICONS.gradeResults,
        requiresDepartmentPermission: 'grades.review',
      },
      {
        title: 'อนุมัติตารางสอน',
        path: paths.admin.scheduleApprovals,
        icon: ICONS.scheduleApprovals,
        requiresSchoolDirector: true,
      },
    ],
  },
  {
    subheader: 'เอกสาร',
    items: [
      {
        title: 'เอกสาร',
        path: paths.admin.documents.root,
        icon: ICONS.documents,
        requiresDepartmentPermission: 'grades.review',
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
        title: 'ข้อมูลหลักบุคลากร',
        path: '#',
        icon: ICONS.staffMasters,
        children: [
          {
            title: 'ประเภทบุคลากร',
            path: paths.admin.staffMasters.staffTypes,
            icon: ICONS.staffTypes,
          },
          {
            title: 'ตำแหน่ง',
            path: paths.admin.staffMasters.positions,
            icon: ICONS.positions,
          },
          {
            title: 'วิทยฐานะ',
            path: paths.admin.staffMasters.academicRanks,
            icon: ICONS.academicRanks,
          },
        ],
      },
      {
        title: 'จัดการฝ่าย',
        path: paths.admin.department.root,
        icon: ICONS.department,
        deepMatch: true,
      },
      {
        title: 'สิทธิ์การใช้งาน',
        path: paths.admin.accessPermissions,
        icon: ICONS.accessPermissions,
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
