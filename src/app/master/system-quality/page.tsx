import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SystemQualityView } from 'src/sections/system-quality/view/system-quality-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `ภาพรวมและคุณภาพระบบ | ${CONFIG.appName}`,
};

export default function Page() {
  return <SystemQualityView />;
}
