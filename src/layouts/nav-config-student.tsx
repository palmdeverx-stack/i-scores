import type { NavMainProps } from './main/nav/types';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** Student navigation for the student-only home experience. */
export const studentNavData: NavMainProps['data'] = [
  {
    title: 'หน้าหลัก',
    path: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
  },
  {
    title: 'วิชาเรียน',
    path: paths.student.subjects,
    icon: <Iconify width={22} icon="solar:notebook-bold-duotone" />,
  },
  {
    title: 'งานที่ต้องส่ง',
    path: paths.student.assignments,
    icon: <Iconify width={22} icon="solar:list-bold" />,
  },
  {
    title: 'การเข้าเรียน',
    path: paths.student.attendance,
    icon: <Iconify width={22} icon="solar:check-circle-bold" />,
  },
];
