import type { Metadata } from 'next';

import { EkruAppListView } from 'src/sections/ekru-app/view';

export const metadata: Metadata = {
};

export default function Page() {
  return <EkruAppListView />;
}
