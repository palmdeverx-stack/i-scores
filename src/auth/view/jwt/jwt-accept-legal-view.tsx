'use client';

import { useRef, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
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
  '& h1': { mb: 1.5 },
  '& h2': { mt: 4, scrollMarginTop: 96 },
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

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Chip
          label="ก่อนเริ่มใช้งาน E-KRU"
          size="small"
          color="primary"
          variant="soft"
          sx={{ alignSelf: 'flex-start' }}
        />
        <Typography component="h1" variant="h4">
          ข้อกำหนดและความเป็นส่วนตัว
        </Typography>
        <Typography color="text.secondary">
          โปรดอ่านเอกสารทั้ง 2 ฉบับก่อนยอมรับและเริ่มใช้งานระบบ
        </Typography>
      </Stack>

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: 'background.neutral' }}
        >
          <Typography variant="subtitle2">เอกสารสำหรับการใช้งาน</Typography>
          <Chip
            size="small"
            color={hasReadBoth ? 'success' : 'default'}
            label={`อ่านแล้ว ${Number(readTerms) + Number(readPrivacy)} / 2 ฉบับ`}
            aria-live="polite"
          />
        </Stack>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="เอกสารข้อกำหนดและความเป็นส่วนตัว"
          sx={{ px: { xs: 2, sm: 3 } }}
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
            p: { xs: 2.5, sm: 4 },
            height: { xs: '45dvh', md: 420 },
            minHeight: 240,
            overflowY: 'auto',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Markdown sx={MARKDOWN_SX}>{tab === 'terms' ? termsOfService : privacyPolicy}</Markdown>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.neutral',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {(tab === 'terms' ? readTerms : readPrivacy)
              ? 'อ่านเอกสารฉบับนี้ครบแล้ว'
              : 'เลื่อนอ่านเอกสารจนจบเพื่อดำเนินการต่อ'}
          </Typography>
          {tab === 'terms' && readTerms && !readPrivacy && (
            <Button size="small" onClick={() => setTab('privacy')}>
              อ่านนโยบายความเป็นส่วนตัวต่อ
            </Button>
          )}
          {tab === 'privacy' && readPrivacy && !readTerms && (
            <Button size="small" onClick={() => setTab('terms')}>
              อ่านข้อกำหนดการใช้บริการต่อ
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ mt: 3, p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={agreed}
              disabled={!hasReadBoth || pending}
              onChange={(event) => setAgreed(event.target.checked)}
            />
          }
          label="ข้าพเจ้าได้อ่านและยอมรับข้อกำหนดการใช้บริการและนโยบายความเป็นส่วนตัวข้างต้น"
        />
        {!hasReadBoth && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            กรุณาเลื่อนอ่านข้อความจนจบทั้งข้อกำหนดการใช้บริการและนโยบายความเป็นส่วนตัวก่อน
            จึงจะติ๊กยอมรับได้
          </Typography>
        )}
      </Paper>

      <Box
        sx={{
          mt: 2,
          gap: 1.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'flex-end',
        }}
      >
        <Button
          color="inherit"
          disabled={acceptMutation.isPending}
          loading={signOutMutation.isPending}
          onClick={() => signOutMutation.mutate()}
        >
          ออกจากระบบ
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={!hasReadBoth || !agreed || signOutMutation.isPending}
          loading={acceptMutation.isPending}
          onClick={() => acceptMutation.mutate()}
        >
          ยอมรับและเข้าใช้งาน
        </Button>
      </Box>
    </Container>
  );
}
