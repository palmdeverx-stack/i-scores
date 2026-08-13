import type { Metadata } from 'next';

import { SystemQualityView } from 'src/sections/system-quality/view/system-quality-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
};

export default function Page() {
  return <SystemQualityView />;
}
