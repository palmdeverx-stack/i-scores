import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'หน้าหลัก | eKru',
  description: 'ดูอันดับในชั้นเรียนและประกาศล่าสุดจากโรงเรียน',
};

export default function Page() {
  return <HomeView />;
}
