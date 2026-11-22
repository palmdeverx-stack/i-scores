import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import {
  RiMailLine,
  RiUserLine,
  RiApps2Line,
  RiAdminLine,
  RiFlowChart,
  RiStore2Line,
  RiBuildingLine,
  RiFileTextLine,
  RiDashboardLine,
  RiPriceTag3Line,
  RiSettings3Line,
  RiShieldCheckLine,
} from 'src/components/remix-icon';

import {
  SALES_DOCUMENT_KINDS,
  SALES_DOCUMENT_LABELS,
} from 'src/sections/sales-documents/sales-document-kinds';

import { organizeMasterNavigation } from './organize-school-navigation';

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
const rawNavData: NavSectionProps['data'] = [
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
        title: 'ลูกค้า Marketplace',
        path: paths.master.marketplaceCustomers,
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
        title: 'ระบบย่อย EKRU',
        path: paths.master.apps,
        icon: ICONS.apps,
      },
    ],
  },
  {
    subheader: 'เอกสารระบบ',
    items: [
      {
        title: 'เอกสารการขาย',
        path: paths.master.salesDocuments,
        icon: <RiFileTextLine />,
        activePathExclusions: [paths.master.salesSellers, paths.master.salesCustomers],
        children: SALES_DOCUMENT_KINDS.map((kind) => ({
          title: SALES_DOCUMENT_LABELS[kind],
          path: paths.master.salesDocumentsByKind(kind),
          allowedRoles: ['master_admin'],
        })),
      },
      {
        title: 'ข้อมูลผู้ขาย',
        path: paths.master.salesSellers,
        icon: <RiStore2Line />,
      },
      {
        title: 'ลูกค้า',
        path: paths.master.salesCustomers,
        icon: <RiUserLine />,
      },
      {
        title: 'การทำงานของระบบ',
        path: paths.master.systemFlow,
        icon: ICONS.systemFlow,
      },
    ],
  },
];

export const navData = organizeMasterNavigation(rawNavData);
