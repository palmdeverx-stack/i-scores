'use client';

import type { TemplateType, LessonTemplate } from '../types';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { toast } from 'src/components/snackbar';

import { TemplatePreview } from './template-preview';
import { getTemplates, applyTemplate } from '../template-actions';
import { TEMPLATE_TYPE_LABELS, TEMPLATE_SCOPE_LABELS } from '../constants';

export function LessonPlanTemplatePickerDialog({
  open,
  onClose,
  lessonPlanId,
  templateType,
  onApplied,
  onSelectTemplate,
}: {
  open: boolean;
  onClose: () => void;
  lessonPlanId?: string;
  templateType: TemplateType;
  onApplied?: () => void | Promise<void>;
  onSelectTemplate?: (template: LessonTemplate) => void | Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LessonTemplate | null>(null);
  const templatesQuery = useQuery({
    queryKey: ['lesson-templates', 'picker', templateType, search],
    queryFn: () => getTemplates({ tab: 'all', templateType, search: search || undefined }),
    enabled: open,
  });
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (onSelectTemplate) {
        await onSelectTemplate(selected!);
        return;
      }
      if (!lessonPlanId) throw new Error('กรุณาบันทึกแผนการสอนก่อนใช้ Template ราย Section');
      await applyTemplate({
        templateId: selected!.id,
        targetType: 'lesson_plan',
        targetId: lessonPlanId,
        sectionType: templateType,
      });
    },
    onSuccess: async () => {
      toast.success(
        onSelectTemplate
          ? 'นำ Template มาเป็นข้อมูลตั้งต้นแล้ว'
          : 'นำ Template มาใช้ใน Section นี้แล้ว'
      );
      await Promise.all([
        onApplied?.(),
        queryClient.invalidateQueries({ queryKey: ['lesson-templates'] }),
      ]);
      setSelected(null);
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  const templates = (templatesQuery.data ?? []).filter(
    (template) => template.status === 'active' || template.can_edit
  );
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>เลือก Template: {TEMPLATE_TYPE_LABELS[templateType]}</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหา Template"
          sx={{ mb: 2 }}
        />
        {templatesQuery.isLoading ? <LinearProgress /> : null}
        {templatesQuery.isError ? (
          <Alert severity="error">{templatesQuery.error.message}</Alert>
        ) : null}
        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: selected ? 'minmax(0, 0.7fr) minmax(320px, 1.3fr)' : 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          <Box sx={{ gap: 1.5, display: 'grid' }}>
            {templates.map((template) => (
              <Card
                component="button"
                type="button"
                key={template.id}
                variant="outlined"
                onClick={() => setSelected(template)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderColor: selected?.id === template.id ? 'primary.main' : 'divider',
                }}
              >
                <Box sx={{ gap: 0.75, display: 'flex' }}>
                  <Chip size="small" label={TEMPLATE_SCOPE_LABELS[template.scope]} />
                  <Chip size="small" label={`v${template.version}`} />
                </Box>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description || 'ไม่มีคำอธิบาย'}
                </Typography>
              </Card>
            ))}
          </Box>
          {selected ? (
            <Card variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Preview
              </Typography>
              <TemplatePreview
                templateType={selected.template_type}
                content={selected.content as Record<string, unknown>}
              />
            </Card>
          ) : null}
        </Box>
        {!templatesQuery.isLoading && !templates.length ? (
          <Alert severity="info">ยังไม่มี Template ที่พร้อมใช้งานสำหรับ Section นี้</Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          variant="contained"
          disabled={!selected || (selected.status !== 'active' && !selected.can_edit)}
          loading={applyMutation.isPending}
          onClick={() => applyMutation.mutate()}
        >
          ใช้ Template นี้
        </Button>
      </DialogActions>
    </Dialog>
  );
}
