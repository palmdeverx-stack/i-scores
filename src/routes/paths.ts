const ROOTS = {
  AUTH: '/auth',
  MASTER: '/master',
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
};

// ----------------------------------------------------------------------

export const paths = {
  legal: {
    privacyPolicy: '/privacy-policy',
    termsOfService: '/terms-of-service',
    serviceAgreement: '/service-agreement',
  },
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  components: '/components',
  docs: 'https://docs.minimals.cc/',
  // AUTH
  auth: {
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
      changePassword: `${ROOTS.AUTH}/jwt/change-password`,
      acceptLegal: `${ROOTS.AUTH}/jwt/accept-legal`,
    },
  },
  // STUDENT
  student: {
    root: ROOTS.STUDENT,
    profile: `${ROOTS.STUDENT}/profile`,
    classroom: `${ROOTS.STUDENT}/classroom`,
    subjects: `${ROOTS.STUDENT}/subjects`,
    timetable: `${ROOTS.STUDENT}/timetable`,
    subjectDetails: (teacherAssignmentId: string) =>
      `${ROOTS.STUDENT}/subjects/${teacherAssignmentId}`,
    assignments: `${ROOTS.STUDENT}/assignments`,
    quiz: (assignmentId: string) => `${ROOTS.STUDENT}/assignments/${assignmentId}/quiz`,
    attendance: `${ROOTS.STUDENT}/attendance`,
    qr: `${ROOTS.STUDENT}/qr`,
  },
  // TEACHER
  teacher: {
    root: ROOTS.TEACHER,
    profile: `${ROOTS.TEACHER}/profile`,
    guide: `${ROOTS.TEACHER}/guide`,
    announcements: `${ROOTS.TEACHER}/announcements`,
    assignments: `${ROOTS.TEACHER}/assignments`,
    students: `${ROOTS.TEACHER}/students`,
    attendanceHistory: `${ROOTS.TEACHER}/students/attendance-history`,
    attendanceScan: `${ROOTS.TEACHER}/attendance-scan`,
    attendanceScanSession: (id: string) => `${ROOTS.TEACHER}/attendance-scan/session/${id}`,
    assignmentAttendanceHistory: (id: string) =>
      `${ROOTS.TEACHER}/assignments/${id}/attendance-history`,
    assignmentDetail: (id: string) => `${ROOTS.TEACHER}/assignments/${id}`,
    assignmentNew: (id: string) => `${ROOTS.TEACHER}/assignments/${id}/new`,
    quizNew: (id: string) => `${ROOTS.TEACHER}/assignments/${id}/quiz/new`,
    gradebook: (assignmentId: string) => `${ROOTS.TEACHER}/gradebook/${assignmentId}`,
    subjectNew: `${ROOTS.TEACHER}/subject/new`,
    classroomNew: `${ROOTS.TEACHER}/classroom/new`,
    enrollmentNew: `${ROOTS.TEACHER}/enrollment/new`,
    timetable: `${ROOTS.TEACHER}/timetable`,
    department: `${ROOTS.TEACHER}/department`,
    departmentMember: (id: string) => `${ROOTS.TEACHER}/department/member/${id}`,
    scheduleBuilder: `${ROOTS.TEACHER}/schedule-builder`,
    departmentAcademicYear: {
      root: `${ROOTS.TEACHER}/department-work/academic-year`,
      semester: (id: string) => `${ROOTS.TEACHER}/department-work/academic-year/${id}/semester`,
    },
    departmentClassroom: `${ROOTS.TEACHER}/department-work/classroom`,
    departmentSubject: `${ROOTS.TEACHER}/department-work/subject`,
    departmentEnrollment: {
      root: `${ROOTS.TEACHER}/department-work/enrollment`,
      classroom: (id: string) => `${ROOTS.TEACHER}/department-work/enrollment/classroom/${id}`,
    },
    departmentAnnouncements: `${ROOTS.TEACHER}/department-work/announcements`,
    departmentStudent: `${ROOTS.TEACHER}/department-work/student`,
    departmentStaff: {
      root: `${ROOTS.TEACHER}/department-work/user`,
      teaching: (id: string) => `${ROOTS.TEACHER}/department-work/user/${id}/teaching`,
    },
  },
  // MASTER ADMIN
  master: {
    root: ROOTS.MASTER,
    school: {
      root: `${ROOTS.MASTER}/school`,
      new: `${ROOTS.MASTER}/school/new`,
      subscription: (id: string) => `${ROOTS.MASTER}/school/${id}/subscription`,
    },
    schoolAdmin: {
      root: `${ROOTS.MASTER}/school-admin`,
      new: `${ROOTS.MASTER}/school-admin/new`,
    },
    subscriptionPlan: {
      root: `${ROOTS.MASTER}/subscription-plan`,
    },
  },
  // SCHOOL ADMIN
  admin: {
    root: ROOTS.ADMIN,
    school: `${ROOTS.ADMIN}/school`,
    guide: `${ROOTS.ADMIN}/guide`,
    announcements: `${ROOTS.ADMIN}/announcements`,
    lineNotifications: `${ROOTS.ADMIN}/line-notifications`,
    user: {
      root: `${ROOTS.ADMIN}/user`,
      teaching: (id: string) => `${ROOTS.ADMIN}/user/${id}/teaching`,
    },
    department: {
      root: `${ROOTS.ADMIN}/department`,
      detail: (id: string) => `${ROOTS.ADMIN}/department/${id}`,
      permissions: `${ROOTS.ADMIN}/department-permissions`,
    },
    student: {
      root: `${ROOTS.ADMIN}/student`,
    },
    academicYear: {
      root: `${ROOTS.ADMIN}/academic-year`,
    },
    classroom: {
      root: `${ROOTS.ADMIN}/classroom`,
    },
    subject: {
      root: `${ROOTS.ADMIN}/subject`,
    },
    teacherAssignment: {
      root: `${ROOTS.ADMIN}/teacher-assignment`,
      detail: (id: string) => `${ROOTS.ADMIN}/teacher-assignment/${id}`,
      assignmentNew: (id: string) => `${ROOTS.ADMIN}/teacher-assignment/${id}/new`,
      quizNew: (id: string) => `${ROOTS.ADMIN}/teacher-assignment/${id}/quiz/new`,
    },
    gradebook: (assignmentId: string) => `${ROOTS.ADMIN}/gradebook/${assignmentId}`,
    scheduleBuilder: `${ROOTS.ADMIN}/schedule-builder`,
    enrollment: {
      root: `${ROOTS.ADMIN}/enrollment`,
      classroom: (id: string) => `${ROOTS.ADMIN}/enrollment/classroom/${id}`,
    },
  },
};
