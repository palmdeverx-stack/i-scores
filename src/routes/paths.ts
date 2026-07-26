import { kebabCase } from 'es-toolkit';

import { _id, _postTitles } from 'src/_mock/assets';

// ----------------------------------------------------------------------

const MOCK_ID = _id[1];
const MOCK_TITLE = _postTitles[2];

const ROOTS = {
  AUTH: '/auth',
  AUTH_DEMO: '/auth-demo',
  MASTER: '/master',
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
};

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  legal: {
    privacyPolicy: '/privacy-policy',
    termsOfService: '/terms-of-service',
    serviceAgreement: '/service-agreement',
  },
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  components: '/components',
  docs: 'https://docs.minimals.cc/',
  changelog: 'https://docs.minimals.cc/changelog/',
  zoneStore: 'https://mui.com/store/items/zone-landing-page/',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  freeUI: 'https://mui.com/store/items/minimal-dashboard-free/',
  figmaUrl: 'https://www.figma.com/design/WadcoP3CSejUDj7YZc87xj/%5BPreview%5D-Minimal-Web.v7.3.0',
  product: {
    root: `/product`,
    checkout: `/product/checkout`,
    details: (id: string) => `/product/${id}`,
    demo: { details: `/product/${MOCK_ID}` },
  },
  post: {
    root: `/post`,
    details: (title: string) => `/post/${kebabCase(title)}`,
    demo: { details: `/post/${kebabCase(MOCK_TITLE)}` },
  },
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
      changePassword: `${ROOTS.AUTH}/jwt/change-password`,
      acceptLegal: `${ROOTS.AUTH}/jwt/accept-legal`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: { signIn: `${ROOTS.AUTH}/auth0/sign-in` },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  authDemo: {
    split: {
      signIn: `${ROOTS.AUTH_DEMO}/split/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/split/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/split/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/split/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/split/verify`,
    },
    centered: {
      signIn: `${ROOTS.AUTH_DEMO}/centered/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/centered/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/centered/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/centered/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/centered/verify`,
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
      new: `${ROOTS.ADMIN}/user/new`,
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
      new: `${ROOTS.ADMIN}/academic-year/new`,
    },
    classroom: {
      root: `${ROOTS.ADMIN}/classroom`,
      new: `${ROOTS.ADMIN}/classroom/new`,
    },
    subject: {
      root: `${ROOTS.ADMIN}/subject`,
      new: `${ROOTS.ADMIN}/subject/new`,
    },
    teacherAssignment: {
      root: `${ROOTS.ADMIN}/teacher-assignment`,
      new: `${ROOTS.ADMIN}/teacher-assignment/new`,
      detail: (id: string) => `${ROOTS.ADMIN}/teacher-assignment/${id}`,
      assignmentNew: (id: string) => `${ROOTS.ADMIN}/teacher-assignment/${id}/new`,
      quizNew: (id: string) => `${ROOTS.ADMIN}/teacher-assignment/${id}/quiz/new`,
    },
    gradebook: (assignmentId: string) => `${ROOTS.ADMIN}/gradebook/${assignmentId}`,
    scheduleBuilder: `${ROOTS.ADMIN}/schedule-builder`,
    enrollment: {
      root: `${ROOTS.ADMIN}/enrollment`,
      new: `${ROOTS.ADMIN}/enrollment/new`,
      classroom: (id: string) => `${ROOTS.ADMIN}/enrollment/classroom/${id}`,
    },
  },
};
