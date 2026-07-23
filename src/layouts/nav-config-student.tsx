import type { NavMainProps } from './main/nav/types';

import { paths } from 'src/routes/paths';

import {
  RiTaskLine,
  RiHome5Line,
  RiQrCodeLine,
  RiBookOpenLine,
  RiCheckboxCircleLine,
} from 'src/components/remix-icon';

// ----------------------------------------------------------------------

/** Student navigation for the student-only home experience. */
export const studentNavData: NavMainProps['data'] = [
  {
    title: 'หน้าหลัก',
    path: '/',
    icon: <RiHome5Line size={22} />,
  },
  {
    title: 'วิชาเรียน',
    path: paths.student.subjects,
    icon: <RiBookOpenLine size={22} />,
    featureKey: 'student.subjects',
  },
  {
    title: 'งานที่ต้องส่ง',
    path: paths.student.assignments,
    icon: <RiTaskLine size={22} />,
    featureKey: 'student.assignments',
  },
  {
    title: 'การเข้าเรียน',
    path: paths.student.attendance,
    icon: <RiCheckboxCircleLine size={22} />,
    featureKey: 'student.attendance',
  },
  {
    title: 'QR ของฉัน',
    path: paths.student.qr,
    icon: <RiQrCodeLine size={22} />,
    featureKey: 'student.qr',
  },
];
