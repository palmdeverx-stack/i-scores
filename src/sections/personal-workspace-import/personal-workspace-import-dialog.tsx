'use client';

import type { ImportablePersonalWorkspace } from './personal-workspace-import-banner';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type ImportResult = {
  classrooms: number;
  subjects: number;
  teacherAssignments: number;
  students: number;
  enrollments: number;
};

async function runImport(includeStudents: boolean): Promise<ImportResult> {
  const response = await fetch('/api/account/personal-workspace-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ includeStudents }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถนำเข้าข้อมูลได้');
  return json.result;
}

type Props = {
  open: boolean;
  importable: ImportablePersonalWorkspace;
  onClose: () => void;
  onImported: () => void;
};

export function PersonalWorkspaceImportDialog({ open, importable, onClose, onImported }: Props) {
  const [includeStudents, setIncludeStudents] = useState(true);

  const importMutation = useMutation({
    mutationFn: () => runImport(includeStudents),
    onSuccess: (result) => {
      toast.success(
        `นำเข้าแล้ว: ${result.classrooms} ห้องเรียน, ${result.subjects} วิชา, ${result.students} นักเรียน, ${result.enrollments} การลงทะเบียน`
      );
      onImported();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onClose={() => !importMutation.isPending && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>เลือกนำเข้าข้อมูล</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          จาก &quot;{importable.sourceSchoolName}&quot; — ระบบจะคัดลอกข้อมูล ของเดิมยังอยู่ครบ
          ไม่ถูกลบหรือย้ายออกไปไหน
        </Typography>

        <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
          <FormControlLabel control={<Checkbox checked disabled />} label="ห้องเรียน วิชา และการมอบหมายครู" />
          <Typography variant="caption" sx={{ display: 'block', pl: 4, color: 'text.secondary' }}>
            {importable.counts.classrooms} ห้องเรียน, {importable.counts.subjects} วิชา
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeStudents}
                onChange={(event) => setIncludeStudents(event.target.checked)}
              />
            }
            label="นักเรียนและการลงทะเบียน"
          />
          <Typography variant="caption" sx={{ display: 'block', pl: 4, color: 'text.secondary' }}>
            {importable.counts.students} คน — จะสร้างเป็นบัญชีนักเรียนใหม่ (username ใหม่)
            ในโรงเรียนนี้
          </Typography>
        </Box>

        <Alert severity="warning" sx={{ mt: 2 }}>
          ห้องเรียน/วิชาที่ชื่อซ้ำกับของเดิมในโรงเรียนจะถูกรวมเป็นอันเดียวกันอัตโนมัติ
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={importMutation.isPending}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          loading={importMutation.isPending}
          onClick={() => importMutation.mutate()}
        >
          นำเข้าข้อมูล
        </Button>
      </DialogActions>
    </Dialog>
  );
}
