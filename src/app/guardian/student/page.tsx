import type { Metadata } from 'next';

import Box from '@mui/material/Box';

import { GuardianStudentProfileView } from 'src/sections/guardian-profile/view/guardian-student-profile-view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: { md: 'fixed' },
        backgroundImage: 'url("/assets/background/bg-images.png")',
      }}
    >
      <GuardianStudentProfileView />
    </Box>
  );
}
