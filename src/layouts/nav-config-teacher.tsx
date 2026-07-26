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
            path: paths.teacher.departmentAcademicYear.root,
            icon: ICONS.academicYear,
            requiresDepartmentPermission: 'academic_years.manage',
          },
          {
            title: 'ห้องเรียน',
            path: paths.teacher.departmentClassroom,
            icon: ICONS.classroom,
            requiresDepartmentPermission: 'classrooms.manage',
          },
          {
            title: 'รายวิชา',
            path: paths.teacher.departmentSubject,
            icon: ICONS.subject,
            requiresDepartmentPermission: 'subjects.manage',
          },
          {
            title: 'ลงทะเบียนนักเรียน',
            path: paths.teacher.departmentEnrollment.root,
            icon: ICONS.studentAdd,
            requiresDepartmentPermission: 'enrollments.manage',
          },
          {
            title: 'ประกาศทั้งโรงเรียน',
            path: paths.teacher.departmentAnnouncements,
            icon: ICONS.announcements,
            requiresDepartmentPermission: 'announcements.manage',
          },
          {
            title: 'นักเรียนทั้งหมด',
            path: paths.teacher.departmentStudent,
            icon: ICONS.allStudents,
            requiresDepartmentPermission: 'students.manage',
          },
          {
            title: 'ครู/บุคลากร',
            path: paths.teacher.departmentStaff.root,
            icon: ICONS.department,
            requiresDepartmentPermission: 'staff.manage',
          },
        ],
      },
    ],
  },
];
