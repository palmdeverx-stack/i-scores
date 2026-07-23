import { languageOptions } from 'src/locales';
import { AuthSplitLayout } from 'src/layouts/auth-split';
import { LanguagePopover } from 'src/layouts/components/language-popover';

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
            'url("https://res.cloudinary.com/dkdbilwtj/image/upload/v1784725452/og-images_mnmhy7.svg")',
        }}
        slotProps={{
          header: {
            slots: {
              rightArea: (
                <LanguagePopover
                  showTranslateIcon
                  data={languageOptions}
                  sx={{
                    color: 'common.white',
                    bgcolor: 'rgba(255, 255, 255, 0.12)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.22)' },
                  }}
                />
              ),
            },
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
