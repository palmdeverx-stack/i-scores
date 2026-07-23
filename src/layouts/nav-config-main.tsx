import type { NavMainProps } from './main/nav/types';

import { RiHome5Line } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

export const navData: NavMainProps['data'] = [
  {
    title: 'อรรคฮาตสี',
    path: '/',
    icon: <RiHome5Line size={22} />,
  },
];
