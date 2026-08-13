import type { Metadata } from 'next';

import { UserGuideView } from 'src/sections/user-guide/view/user-guide-view';

// ----------------------------------------------------------------------

export default function Page() {
  return <UserGuideView role="teacher" />;
}
