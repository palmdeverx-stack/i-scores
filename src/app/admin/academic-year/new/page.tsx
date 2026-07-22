import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มปีการศึกษา - ${CONFIG.appName}` };

export default function Page() {
  redirect(paths.admin.academicYear.root);
}
