import type { Metadata } from 'next';

import { SchoolProfileView } from 'src/sections/school/view/school-profile-view';

// ----------------------------------------------------------------------

export default function Page() {
  return <SchoolProfileView readOnly />;
}
