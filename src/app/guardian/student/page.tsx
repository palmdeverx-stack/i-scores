import type { Metadata } from 'next';

import Box from '@mui/material/Box';

import { CONFIG } from 'src/global-config';

import { GuardianStudentProfileView } from 'src/sections/guardian-profile/view/guardian-student-profile-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ข้อมูลนักเรียนสำหรับผู้ปกครอง - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: { md: 'fixed' },
        backgroundImage: 'url("/assets/background/og-images-class-go.jpg")',
      }}
    >
      <GuardianStudentProfileView />
    </Box>
  );
}
