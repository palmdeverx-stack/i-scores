'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import AlertTitle from '@mui/material/AlertTitle';

import { toast } from 'src/components/snackbar';

import { PersonalWorkspaceImportDialog } from './personal-workspace-import-dialog';

// ----------------------------------------------------------------------

export type ImportablePersonalWorkspace = {
  sourceSchoolId: string;
  sourceSchoolName: string;
  counts: { classrooms: number; subjects: number; students: number };
};

async function getImportable(): Promise<ImportablePersonalWorkspace | null> {
  const response = await fetch('/api/account/personal-workspace-import');
  if (!response.ok) return null;
  const json = await response.json();
  return json.importable;
}

async function dismissImport(): Promise<void> {
  await fetch('/api/account/personal-workspace-import/dismiss', { method: 'POST' });
}

export function PersonalWorkspaceImportBanner() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const importableQuery = useQuery({
    queryKey: ['personal-workspace-importable'],
    queryFn: getImportable,
  });

  const dismissMutation = useMutation({
    mutationFn: dismissImport,
    onSuccess: async () => {
      toast.success('ซ่อนการแจ้งเตือนนี้แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['personal-workspace-importable'] });
    },
  });

  const importable = importableQuery.data;
  if (!importable) return null;

  const { counts } = importable;
  const total = counts.classrooms + counts.subjects + counts.students;
  if (total === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Alert
        severity="info"
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              color="inherit"
              disabled={dismissMutation.isPending}
              onClick={() => dismissMutation.mutate()}
            >
              ไว้ทีหลัง
            </Button>
            <Button size="small" variant="contained" onClick={() => setDialogOpen(true)}>
              เลือกนำเข้า
            </Button>
          </Box>
        }
      >
        <AlertTitle>พบข้อมูลในพื้นที่ส่วนตัวของคุณ</AlertTitle>
        {`"${importable.sourceSchoolName}" มี ${counts.classrooms} ห้องเรียน, ${counts.subjects} วิชา และ ${counts.students} นักเรียน — ต้องการนำเข้ามาที่โรงเรียนนี้ไหม?`}
      </Alert>

      <PersonalWorkspaceImportDialog
        open={dialogOpen}
        importable={importable}
        onClose={() => setDialogOpen(false)}
        onImported={async () => {
          setDialogOpen(false);
          await queryClient.invalidateQueries({ queryKey: ['personal-workspace-importable'] });
        }}
      />
    </Box>
  );
}
