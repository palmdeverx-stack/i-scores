import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiTeamLine,
  RiBook2Line,
  RiGroupLine,
  RiSchoolLine,
  RiQrScan2Line,
  RiUserAddLine,
  RiCalendarLine,
  RiBookOpenLine,
  RiFileChartLine,
  RiFileList3Line,
  RiDashboardLine,
  RiMegaphoneLine,
  RiFileSearchLine,
  RiFileHistoryLine,
  RiPresentationLine,
  RiCalendarCheckLine,
  RiOrganizationChart,
  RiGraduationCapLine,
  RiCalendarScheduleLine,
} from 'src/components/remix-icon';

// ----------------------------------------------------------------------

const ICONS = {
  dashboard: <RiDashboardLine />,
  school: <RiSchoolLine />,
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
  scheduleSubmissions: <RiFileHistoryLine />,
  scheduleApprovals: <RiCalendarCheckLine />,
  gradeReviews: <RiFileSearchLine />,
  gradeResults: <RiFileChartLine />,
  documents: <RiFileList3Line />,
};

// ----------------------------------------------------------------------

/**
 * Teacher navigation — scoped to the subjects/classrooms they're assigned to.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'ภาพรวม',
    items: [
      {
        title: 'หน้าหลัก',
        path: paths.teacher.root,
        icon: ICONS.dashboard,
        requiresDepartmentPermission: 'dashboard.view',
      },
      {
        title: 'ข้อมูลโรงเรียน',
        path: paths.teacher.school,
        icon: ICONS.school,
        featureKey: 'admin.school_profile',
      },
      {
        title: 'สร้างกลุ่มเรียน',
        path: paths.teacher.classroomNew,
        icon: ICONS.classroom,
        featureKey: 'teacher.manage_classrooms',
      },
      {
        title: 'ชั้นเรียนที่สอน',
        path: paths.teacher.assignments,
        icon: ICONS.assignments,
        deepMatch: true,
        featureKey: 'teacher.assignments',
        requiresDepartmentPermission: 'teaching.assignments',
      },
      {
        title: 'รายวิชา',
        path: paths.teacher.subjectRoot,
        icon: ICONS.subject,
        deepMatch: true,
        children: [
          {
            title: 'คลังรายวิชา',
            path: paths.teacher.subjectRoot,
            icon: ICONS.subject,
            deepMatch: true,
            activePathExclusions: [paths.teacher.subjectNew],
            featureKey: 'teacher.manage_subjects',
          },
          {
            title: 'สร้างรายวิชา',
            path: paths.teacher.subjectNew,
            icon: ICONS.subject,
            featureKey: 'teacher.manage_subjects',
          },
        ],
      },
      {
        title: 'แผนการสอน',
        path: paths.teacher.lessonPlans.root,
        icon: ICONS.documents,
        deepMatch: true,
        featureKey: 'teacher.lesson_plans',
        requiresDepartmentPermission: 'teaching.assignments',
        children: [
          {
            title: 'แผนการสอนของฉัน',
            path: paths.teacher.lessonPlans.root,
            icon: ICONS.documents,
            activePathExclusions: [
              paths.teacher.lessonPlans.templates,
              paths.teacher.lessonPlans.templateLibrary,
            ],
          },
          {
            title: 'Template แผนการสอน',
            path: paths.teacher.lessonPlans.templates,
            icon: ICONS.gradeReviews,
          },
          {
            title: 'รวม Template ทุกประเภท',
            path: paths.teacher.lessonPlans.templateLibrary,
            icon: ICONS.documents,
          },
        ],
      },
      {
        title: 'ผู้เรียน',
        path: paths.teacher.students,
        icon: ICONS.students,
        deepMatch: true,
        children: [
          {
            title: 'รายชื่อผู้เรียน',
            path: paths.teacher.students,
            icon: ICONS.students,
            featureKey: 'teacher.students',
            requiresDepartmentPermission: 'teaching.students',
          },
          {
            title: 'เพิ่มผู้เรียน',
            path: paths.teacher.enrollmentNew,
            icon: ICONS.studentAdd,
            featureKey: 'teacher.manage_enrollments',
          },
        ],
      },
      {
        title: 'สแกนเช็คชื่อ',
        path: paths.teacher.attendanceScan,
        icon: ICONS.attendance,
        deepMatch: true,
        featureKey: 'teacher.qr_attendance',
        requiresDepartmentPermission: 'teaching.attendance',
      },
      {
        title: 'ตารางสอน',
        path: paths.teacher.timetable,
        icon: ICONS.timetable,
        featureKey: 'teacher.timetable',
        requiresDepartmentPermission: 'teaching.timetable',
      },
      {
        title: 'ประกาศ',
        path: paths.teacher.announcements,
        icon: ICONS.announcements,
        featureKey: 'teacher.announcements',
        requiresDepartmentPermission: 'teaching.announcements',
      },
      {
        title: 'งานฝ่ายของฉัน',
        path: paths.teacher.department,
        icon: ICONS.department,
        featureKey: 'admin.departments',
        requiresDepartment: true,
      },
      {
        title: 'จัดตารางสอน',
        path: paths.teacher.scheduleBuilder,
        icon: ICONS.scheduleBuilder,
        featureKey: 'academic.schedule_workflow',
        requiresDepartmentPermission: 'schedule.manage',
      },
      {
        title: 'สถานะการลงนามตารางสอน',
        path: paths.teacher.scheduleSubmissions,
        icon: ICONS.scheduleSubmissions,
        featureKey: 'academic.schedule_workflow',
        requiresDepartmentPermission: 'schedule.manage',
      },
      {
        title: 'อนุมัติตารางสอน',
        path: paths.teacher.scheduleApprovals,
        icon: ICONS.scheduleApprovals,
        featureKey: 'academic.schedule_workflow',
        requiresDepartmentPermission: 'schedule.approve',
      },
      {
        title: 'ตรวจสอบผลการเรียน',
        path: paths.teacher.gradeReviews,
        icon: ICONS.gradeReviews,
        featureKey: 'academic.grade_workflow',
        requiresDepartmentPermission: 'grades.approve',
      },
      {
        title: 'ตรวจแผนการสอน',
        path: paths.teacher.lessonPlanReviews,
        icon: ICONS.gradeReviews,
        featureKey: 'teacher.lesson_plans',
        requiresDepartmentPermission: 'lesson_plans.review',
      },
      {
        title: 'ผลการเรียน',
        path: paths.teacher.gradeResults,
        icon: ICONS.gradeResults,
        featureKey: 'academic.grade_workflow',
        requiresDepartmentPermission: 'grades.review',
      },
      {
        title: 'ปีการศึกษาและภาคเรียน',
        path: paths.teacher.departmentAcademicYear.root,
        icon: ICONS.academicYear,
        featureKey: 'admin.academic_years',
        requiresDepartmentPermission: 'academic_years.manage',
      },
      {
        title: 'ห้องเรียน',
        path: paths.teacher.departmentClassroom,
        icon: ICONS.classroom,
        featureKey: 'admin.classrooms',
        requiresDepartmentPermission: 'classrooms.manage',
      },
      {
        title: 'วิชาและหลักสูตร',
        path: paths.teacher.departmentSubject,
        icon: ICONS.subject,
        featureKey: 'admin.subjects',
        requiresDepartmentPermission: 'subjects.manage',
      },
      {
        title: 'ลงทะเบียนนักเรียน',
        path: paths.teacher.departmentEnrollment.root,
        icon: ICONS.studentAdd,
        featureKey: 'admin.enrollments',
        requiresDepartmentPermission: 'enrollments.manage',
      },
      {
        title: 'ประกาศทั้งโรงเรียน',
        path: paths.teacher.departmentAnnouncements,
        icon: ICONS.announcements,
        featureKey: 'admin.announcements',
        requiresDepartmentPermission: 'announcements.manage',
      },
      {
        title: 'นักเรียน',
        path: paths.teacher.departmentStudent,
        icon: ICONS.allStudents,
        featureKey: 'admin.students',
        requiresDepartmentPermission: 'students.manage',
      },
      {
        title: 'ครู/บุคลากร',
        path: paths.teacher.departmentStaff.root,
        icon: ICONS.department,
        featureKey: 'admin.staff',
        requiresDepartmentPermission: 'staff.manage',
      },
      {
        title: 'เอกสาร',
        path: paths.teacher.documents.root,
        icon: ICONS.documents,
        featureKey: 'academic.documents',
        requiresDepartmentPermission: 'documents.access',
        children: [
          {
            title: 'เอกสารของฉัน',
            path: paths.teacher.documents.my,
            icon: ICONS.documents,
          },
          {
            title: 'ตัวอย่างเอกสาร',
            path: paths.teacher.documents.templates,
            icon: ICONS.gradeReviews,
          },
        ],
      },
    ],
  },
];
