import { renderSchoolInviteEmail } from 'src/lib/school-invite-email';

import { SchoolEditView, SchoolCreateView } from 'src/sections/school/view/school-create-view';

// ----------------------------------------------------------------------

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const { edit } = await searchParams;
  const emailPreview = renderSchoolInviteEmail({
    schoolName: 'ตัวอย่างวิทยา',
    schoolCode: '12345678',
    adminUsername: 'admin.12345678',
    adminPassword: 'Example-Password',
    signInUrl: 'https://e-kru.com/auth/jwt/sign-in',
  });

  if (edit !== undefined) {
    return (
      <SchoolEditView schoolId={typeof edit === 'string' ? edit : ''} emailPreview={emailPreview} />
    );
  }

  return <SchoolCreateView emailPreview={emailPreview} />;
}
