import { AuthSplitLayout } from 'src/layouts/auth-split';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <GuestGuard>
      <AuthSplitLayout
        sx={{
          minHeight: '100dvh',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: { xs: '42% center', md: 'center' },
          backgroundImage:
            'url("https://res.cloudinary.com/dkdbilwtj/image/upload/v1784658769/og-images-class-go_jiv3f7.jpg")',
        }}
        slotProps={{
          header: {
            slots: { rightArea: null },
            sx: { color: 'common.white' },
          },
          content: {
            sx: {
              px: { xs: 2, sm: 4, md: 8 },
              py: { xs: 10, md: 12 },
              alignItems: 'center',
            },
          },
        }}
      >
        {children}
      </AuthSplitLayout>
    </GuestGuard>
  );
}
