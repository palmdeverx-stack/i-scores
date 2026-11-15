'use client';

import { useRef, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';

import { Markdown } from 'src/components/markdown';
import { RemixIcon } from 'src/components/remix-icon';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { signOut, acceptLegal } from '../../context/jwt';
import { getHomePathForRole } from '../../utils/role-home-path';

// ----------------------------------------------------------------------

type Props = {
  termsOfService: string;
  privacyPolicy: string;
};

const MARKDOWN_SX = {
  fontSize: 14,
  lineHeight: 1.9,
  overflowWrap: 'anywhere',
  '&& h1': { mt: 0, mb: 2, fontSize: { xs: 22, sm: 26 }, lineHeight: 1.5 },
  '&& h2': { mt: 3, mb: 1.5, fontSize: { xs: 18, sm: 21 }, lineHeight: 1.6, scrollMarginTop: 96 },
  '&& h3': { mt: 2.5, mb: 1, fontSize: 17, lineHeight: 1.6 },
  '&& p, && li': { fontSize: 14, lineHeight: 1.9 },
  '& blockquote': {
    m: 0,
    mt: 3,
    px: 2.5,
    py: 1,
    borderRadius: 1.5,
    color: 'warning.darker',
    bgcolor: 'warning.lighter',
    borderLeftColor: 'warning.main',
  },
  '& table': { minWidth: 480 },
} as const;

const SCROLL_BOTTOM_THRESHOLD = 24;

export function JwtAcceptLegalView({ termsOfService, privacyPolicy }: Props) {
  const router = useRouter();
  const { user, checkUserSession } = useAuthContext();

  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');
  const [agreed, setAgreed] = useState(false);
  const [readTerms, setReadTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  const hasReadBoth = readTerms && readPrivacy;

  const markReadIfAtBottom = (el: HTMLDivElement) => {
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
    if (!atBottom) return;
    if (tab === 'terms') setReadTerms(true);
    else setReadPrivacy(true);
  };

  useEffect(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    el.scrollTop = 0;
    // Content shorter than the box (nothing to scroll) counts as read immediately.
    markReadIfAtBottom(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const acceptMutation = useMutation({
    mutationFn: acceptLegal,
    onSuccess: async () => {
      await checkUserSession?.();
      router.replace(getHomePathForRole(user?.role));
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
      await checkUserSession?.();
    },
  });

  const pending = acceptMutation.isPending || signOutMutation.isPending;
  const mutationError = acceptMutation.error ?? signOutMutation.error;
  const errorMessage = mutationError ? getErrorMessage(mutationError) : null;

  const readCount = Number(readTerms) + Number(readPrivacy);
  const currentDocumentRead = tab === 'terms' ? readTerms : readPrivacy;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
          gap: { xs: 3, md: 6 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ pt: { md: 2 } }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2,
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
              mb: 2.5,
            }}
          >
            <RemixIcon icon="solar:shield-check-bold" width={26} />
          </Box>
          <Typography variant="overline" color="text.secondary">
            เริ่มต้นใช้งาน EKRU
          </Typography>
          <Typography component="h1" variant="h4" sx={{ mt: 1, mb: 1.5, lineHeight: 1.4 }}>
            ข้อกำหนดและ
            <br />
            ความเป็นส่วนตัว
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            โปรดอ่านเอกสารทั้ง 2 ฉบับ เพื่อทำความเข้าใจการใช้บริการและการดูแลข้อมูลของคุณ
          </Typography>

          <Stack spacing={2} sx={{ mt: 3.5, display: { xs: 'none', md: 'flex' } }}>
            {[
              {
                label: 'ข้อกำหนดการใช้บริการ',
                detail: 'เงื่อนไขและข้อตกลงในการใช้งาน',
                read: readTerms,
              },
              {
                label: 'นโยบายความเป็นส่วนตัว',
                detail: 'การเก็บและใช้ข้อมูลส่วนบุคคล',
                read: readPrivacy,
              },
              { label: 'ยืนยันและเริ่มใช้งาน', detail: 'ยอมรับเอกสารทั้งสองฉบับ', read: agreed },
            ].map((item, index) => (
              <Stack key={item.label} direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: item.read ? 'success.lighter' : 'background.neutral',
                    color: item.read ? 'success.dark' : 'text.secondary',
                    typography: 'caption',
                    fontWeight: 700,
                  }}
                >
                  {item.read ? <RemixIcon icon="solar:check-circle-bold" width={18} /> : index + 1}
                </Box>
                <Box>
                  <Typography variant="subtitle2">{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.detail}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            minWidth: 0,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: (theme) => theme.vars.customShadows.z8,
          }}
        >
          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography variant="subtitle1">อ่านก่อนเริ่มใช้งาน</Typography>
              <Typography
                variant="caption"
                color={hasReadBoth ? 'success.main' : 'text.secondary'}
                aria-live="polite"
                sx={{ flexShrink: 0 }}
              >
                อ่านแล้ว {readCount} / 2 ฉบับ
              </Typography>
            </Stack>
            <Box aria-hidden="true" sx={{ display: 'flex', gap: 0.75, mt: 1.5 }}>
              {[readTerms, readPrivacy].map((read, index) => (
                <Box
                  key={index}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 1,
                    bgcolor: read ? 'success.main' : 'background.neutral',
                    transition: 'background-color 200ms',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="fullWidth"
            aria-label="เอกสารข้อกำหนดและความเป็นส่วนตัว"
            sx={{
              px: { xs: 1, sm: 3 },
              bgcolor: 'background.neutral',
              '& .MuiTab-root': { px: 1, minWidth: 0, fontSize: { xs: 12, sm: 14 }, minHeight: 56 },
            }}
          >
            <Tab
              id="legal-tab-terms"
              aria-controls="legal-panel-terms"
              value="terms"
              label="ข้อกำหนดการใช้บริการ"
              icon={
                readTerms ? (
                  <RemixIcon
                    icon="solar:check-circle-bold"
                    width={16}
                    sx={{ color: 'success.main' }}
                  />
                ) : undefined
              }
              iconPosition="end"
            />
            <Tab
              id="legal-tab-privacy"
              aria-controls="legal-panel-privacy"
              value="privacy"
              label="นโยบายความเป็นส่วนตัว"
              icon={
                readPrivacy ? (
                  <RemixIcon
                    icon="solar:check-circle-bold"
                    width={16}
                    sx={{ color: 'success.main' }}
                  />
                ) : undefined
              }
              iconPosition="end"
            />
          </Tabs>

          <Box
            ref={scrollBoxRef}
            role="tabpanel"
            id={`legal-panel-${tab}`}
            aria-labelledby={`legal-tab-${tab}`}
            tabIndex={0}
            onScroll={(event) => markReadIfAtBottom(event.currentTarget)}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              height: { xs: '46dvh', md: 'min(48dvh, 480px)' },
              minHeight: 260,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              scrollbarWidth: 'thin',
              borderTop: 1,
              borderBottom: 1,
              borderColor: 'divider',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: -2,
              },
            }}
          >
            <Markdown sx={MARKDOWN_SX}>{tab === 'terms' ? termsOfService : privacyPolicy}</Markdown>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={0.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            sx={{ px: { xs: 2.5, sm: 3 }, py: 1.25, minHeight: 52, bgcolor: 'background.neutral' }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ color: currentDocumentRead ? 'success.main' : 'text.secondary' }}
            >
              <RemixIcon
                icon={currentDocumentRead ? 'solar:check-circle-bold' : 'solar:info-circle-bold'}
                width={16}
              />
              <Typography variant="caption" aria-live="polite">
                {currentDocumentRead
                  ? 'อ่านเอกสารฉบับนี้ครบแล้ว'
                  : 'เลื่อนอ่านจนจบเพื่อดำเนินการต่อ'}
              </Typography>
            </Stack>
            {currentDocumentRead && !hasReadBoth && (
              <Button
                size="small"
                onClick={() => setTab(tab === 'terms' ? 'privacy' : 'terms')}
                sx={{ flexShrink: 0 }}
              >
                อ่านเอกสารถัดไป
              </Button>
            )}
          </Stack>

          <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
            {!!errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <FormControlLabel
              sx={{
                m: 0,
                alignItems: 'flex-start',
                '& .MuiCheckbox-root': { p: 0, mr: 1.25, mt: 0.25 },
                '& .MuiFormControlLabel-label': { typography: 'body2', lineHeight: 1.8 },
              }}
              control={
                <Checkbox
                  checked={agreed}
                  disabled={!hasReadBoth || pending}
                  onChange={(event) => setAgreed(event.target.checked)}
                  slotProps={{ input: { 'aria-describedby': 'legal-consent-help' } }}
                />
              }
              label="ข้าพเจ้าได้อ่านและยอมรับข้อกำหนดการใช้บริการและนโยบายความเป็นส่วนตัว"
            />
            <Typography
              id="legal-consent-help"
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1, ml: 4 }}
            >
              {hasReadBoth
                ? 'ทำเครื่องหมายยอมรับเพื่อเริ่มใช้งานระบบ'
                : 'อ่านเอกสารให้ครบทั้ง 2 ฉบับก่อนทำเครื่องหมายยอมรับ'}
            </Typography>
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button
                color="inherit"
                size="large"
                disabled={acceptMutation.isPending}
                loading={signOutMutation.isPending}
                onClick={() => signOutMutation.mutate()}
                sx={{ flexShrink: 0 }}
              >
                ออกจากระบบ
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={!hasReadBoth || !agreed || signOutMutation.isPending}
                loading={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                ยอมรับและเริ่มใช้งาน
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
