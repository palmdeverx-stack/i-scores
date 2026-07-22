import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  user: icon('ic-user'),
  folder: icon('ic-folder'),
  dashboard: icon('ic-dashboard'),
};

// ----------------------------------------------------------------------

/**
 * Master admin navigation — system-wide, across every school.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'ภาพรวม',
    items: [{ title: 'ภาพรวมระบบ', path: paths.master.root, icon: ICONS.dashboard }],
  },
  {
    subheader: 'การจัดการระบบ',
    items: [
      {
        title: 'โรงเรียนทั้งหมด',
        path: paths.master.school.root,
        icon: ICONS.folder,
      },
      {
        title: 'ผู้ดูแลโรงเรียน',
        path: paths.master.schoolAdmin.root,
        icon: ICONS.user,
      },
    ],
  },
];
