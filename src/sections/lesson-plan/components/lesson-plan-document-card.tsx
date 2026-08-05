'use client';

import type { ReactNode, KeyboardEvent } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

type StatusColor = 'default' | 'info' | 'warning' | 'success' | 'error';

export type LessonPlanDocumentCardData = {
  title: string;
  unitNumber?: number | null;
  unitName?: string | null;
  previewText?: string | null;
  sectionCount?: number;
  durationPeriods?: number | null;
  versionNumber?: number | null;
  status?: { label: string; color: StatusColor };
  caption?: string | null;
  reviewNote?: string | null;
};

export function LessonPlanDocumentCard({
  data,
  compact = false,
  actions,
  onOpen,
}: {
  data: LessonPlanDocumentCardData;
  compact?: boolean;
  actions?: ReactNode;
  onOpen: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  const detailParts = [
    data.sectionCount ? `${data.sectionCount} ส่วน` : null,
    data.durationPeriods ? `${data.durationPeriods} คาบ` : null,
    data.versionNumber ? `v${data.versionNumber}` : null,
  ].filter(Boolean);

  return (
    <Card
      role="button"
      tabIndex={0}
      variant="outlined"
      aria-label={`เปิดพรีวิว ${data.title}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      sx={{
        p: compact ? 1.25 : 1.5,
        minWidth: 0,
        display: 'flex',
        cursor: 'pointer',
        borderRadius: 3,
        flexDirection: 'column',
        transition: (theme) =>
          theme.transitions.create(['transform', 'box-shadow', 'border-color']),
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: 'primary.light',
          boxShadow: (theme) => theme.customShadows.z12,
        },
      }}
    >
      <Box
        sx={{
          p: 1.5,
          height: compact ? 160 : 250,
          position: 'relative',
          borderRadius: 2.5,
          bgcolor: 'grey.300',
          border: '1px solid',
          borderColor: 'primary.lighter',
          '&::before, &::after': {
            left: '10%',
            right: '10%',
            content: '""',
            height: compact ? 8 : 12,
            bottom: -8,
            position: 'absolute',
            borderRadius: '0 0 12px 12px',
            bgcolor: 'grey.300',
            opacity: 0.55,
          },
          '&::after': { left: '15%', right: '15%', bottom: -14, opacity: 0.3 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'grid',
            overflow: 'hidden',
            placeItems: 'center',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              p: compact ? 1.25 : 2,
              width: '48%',
              height: '100%',
              overflow: 'hidden',
              color: 'grey.800',
              bgcolor: 'common.white',
            }}
          >
            <Typography sx={{ mb: 1, fontSize: 6, fontWeight: 700, textAlign: 'center' }}>
              {data.title}
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {data.unitNumber || data.unitName ? (
              <Typography sx={{ fontSize: 5, fontWeight: 700 }}>
                {data.unitNumber ? `หน่วยที่ ${data.unitNumber} ` : ''}
                {data.unitName}
              </Typography>
            ) : null}
            <Typography
              sx={{
                mt: 0.75,
                fontSize: 4.5,
                lineHeight: 1.6,
                overflow: 'hidden',
                whiteSpace: 'pre-line',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 8 : 12,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {data.previewText || data.unitName || data.title}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ left: 0, bottom: 0, position: 'absolute' }}>
          <Typography
            component="span"
            sx={{
              px: 1,
              py: 0.5,
              display: 'block',
              color: 'common.white',
              bgcolor: 'primary.darker',
              borderRadius: '0 8px 0 8px',
              typography: 'subtitle2',
            }}
          >
            PDF
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: compact ? 0.5 : 1, pt: compact ? 2.5 : 3, pb: 1, minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant={compact ? 'subtitle1' : 'h5'}
          sx={{
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {data.title}
        </Typography>

        {detailParts.length || data.status ? (
          <Box sx={{ gap: 1, mt: 0.75, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {detailParts.length ? (
              <Typography variant={compact ? 'caption' : 'body1'} color="text.secondary">
                {detailParts.join(' · ')}
              </Typography>
            ) : null}
            {data.status ? (
              <Chip size="small" color={data.status.color} label={data.status.label} />
            ) : null}
          </Box>
        ) : null}

        {data.caption ? (
          <Typography
            variant="caption"
            sx={{
              mt: 0.75,
              display: 'block',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.caption}
          </Typography>
        ) : null}

        {data.reviewNote ? (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
            ฝ่ายวิชาการ: {data.reviewNote}
          </Alert>
        ) : null}
      </Box>

      {actions ? (
        <>
          <Divider sx={{ my: 1 }} />
          <Box
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            sx={{ gap: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
          >
            {actions}
          </Box>
        </>
      ) : null}
    </Card>
  );
}
