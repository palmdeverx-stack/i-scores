import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SystemFlowView } from 'src/sections/system-flow/view/system-flow-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `การทำงานของระบบ - ${CONFIG.appName}` };

export default function Page() {
  return <SystemFlowView />;
}
