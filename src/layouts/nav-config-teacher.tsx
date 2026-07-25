import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiTeamLine,
  RiBook2Line,
  RiGroupLine,
  RiQrScan2Line,
  RiUserAddLine,
  RiCalendarLine,
  RiBookOpenLine,
  RiDashboardLine,
  RiMegaphoneLine,
  RiSettings3Line,
  RiPresentationLine,
  RiOrganizationChart,
  RiGraduationCapLine,
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
  department: <RiTeamLine />,
  scheduleBuilder: <RiOrganizationChart />,
  academicYear: <RiCalendarLine />,
  allStudents: <RiGraduationCapLine />,
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
        title: 'งานฝ่าย',
        path: '#',
        icon: ICONS.department,
        children: [
          {
            title: 'งานฝ่ายของฉัน',
            path: paths.teacher.department,
            icon: ICONS.department,
            requiresDepartment: true,
          },
          {
            title: 'จัดตารางสอน',
            path: paths.teacher.scheduleBuilder,
            icon: ICONS.scheduleBuilder,
            requiresDepartmentPermission: 'schedule.manage',
          },
          {
            title: 'ปีการศึกษา',
            path: paths.admin.academicYear.root,
            icon: ICONS.academicYear,
            requiresDepartmentPermission: 'academic_years.manage',
          },
          {
            title: 'ห้องเรียน',
            path: paths.admin.classroom.root,
            icon: ICONS.classroom,
            requiresDepartmentPermission: 'classrooms.manage',
          },
          {
            title: 'รายวิชา',
            path: paths.admin.subject.root,
            icon: ICONS.subject,
            requiresDepartmentPermission: 'subjects.manage',
          },
          {
            title: 'ลงทะเบียนนักเรียน',
            path: paths.admin.enrollment.root,
            icon: ICONS.studentAdd,
            requiresDepartmentPermission: 'enrollments.manage',
          },
          {
            title: 'ประกาศทั้งโรงเรียน',
            path: paths.admin.announcements,
            icon: ICONS.announcements,
            requiresDepartmentPermission: 'announcements.manage',
          },
          {
            title: 'นักเรียนทั้งหมด',
            path: paths.admin.student.root,
            icon: ICONS.allStudents,
            requiresDepartmentPermission: 'students.manage',
          },
          {
            title: 'ครู/บุคลากร',
            path: paths.admin.user.root,
            icon: ICONS.department,
            requiresDepartmentPermission: 'staff.manage',
          },
        ],
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
