import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EkruAppListView } from 'src/sections/ekru-app/view';

export const metadata: Metadata = {
  title: `ระบบย่อย E-KRU | ${CONFIG.appName}`,
};

export default function Page() {
  return <EkruAppListView />;
}
