import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiMailLine,
  RiApps2Line,
  RiAdminLine,
  RiFlowChart,
  RiBuildingLine,
  RiDashboardLine,
  RiPriceTag3Line,
  RiSettings3Line,
  RiShieldCheckLine,
} from 'src/components/remix-icon';

// ----------------------------------------------------------------------

const ICONS = {
  dashboard: <RiDashboardLine />,
  school: <RiBuildingLine />,
  schoolAdmin: <RiAdminLine />,
  subscription: <RiPriceTag3Line />,
  systemFlow: <RiFlowChart />,
  systemQuality: <RiShieldCheckLine />,
  emailSettings: <RiMailLine />,
  uiSettings: <RiSettings3Line />,
  apps: <RiApps2Line />,
};

// ----------------------------------------------------------------------

/**
 * Master admin navigation — system-wide, across every school.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'ภาพรวม',
    items: [
      { title: 'ภาพรวมระบบ', path: paths.master.root, icon: ICONS.dashboard },
      {
        title: 'ภาพรวมและคุณภาพระบบ',
        path: paths.master.systemQuality,
        icon: ICONS.systemQuality,
      },
    ],
  },
  {
    subheader: 'การจัดการระบบ',
    items: [
      {
        title: 'โรงเรียนทั้งหมด',
        path: paths.master.school.root,
        icon: ICONS.school,
      },
      {
        title: 'ผู้ดูแลโรงเรียน',
        path: paths.master.schoolAdmin.root,
        icon: ICONS.schoolAdmin,
      },
      {
        title: 'ตั้งค่าแพ็กเกจ',
        path: paths.master.subscriptionPlan.root,
        icon: ICONS.subscription,
      },
      {
        title: 'ตั้งค่าหน้าตาระบบ',
        path: paths.master.uiSettings,
        icon: ICONS.uiSettings,
      },
      {
        title: 'ตั้งค่าการส่งอีเมล',
        path: paths.master.emailSettings,
        icon: ICONS.emailSettings,
      },
      {
        title: 'ระบบย่อย E-KRU',
        path: paths.master.apps,
        icon: ICONS.apps,
      },
    ],
  },
  {
    subheader: 'เอกสารระบบ',
    items: [
      {
        title: 'การทำงานของระบบ',
        path: paths.master.systemFlow,
        icon: ICONS.systemFlow,
      },
    ],
  },
];
