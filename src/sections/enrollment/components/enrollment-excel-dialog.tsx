import type { EnrollmentImportRow } from '../enrollment-import-schema';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';

import { ENROLLMENT_IMPORT_LIMIT } from '../enrollment-import-schema';
import { readEnrollmentWorkbook, createEnrollmentWorkbook } from '../enrollment-excel';

type Props = {
  academicYearId: string;
  year: string;
  classroomNames: string[];
  onClose: () => void;
};

export function EnrollmentExcelDialog({ academicYearId, year, classroomNames, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<EnrollmentImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);

  const download = async () => {
    setBusy(true);
    setMessage('');
    setErrors([]);
    try {
      const { XLSX, workbook } = await createEnrollmentWorkbook(
        academicYearId,
        year,
        classroomNames
      );
      XLSX.writeFile(workbook, `เทมเพลตลงทะเบียน-${year}.xlsx`);
    } catch {
      setMessage('ดาวน์โหลดเทมเพลตไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (file: File) => {
    setFileName(file.name);
    setRows([]);
    setMessage('');
    setErrors([]);
    setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 2 * 1024 * 1024) {
        throw new Error('กรุณาเลือกไฟล์ .xlsx ขนาดไม่เกิน 2 MB');
      }
      setRows(await readEnrollmentWorkbook(file, academicYearId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'อ่านไฟล์ Excel ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const importRows = async () => {
    setBusy(true);
    setMessage('');
    setErrors([]);
    try {
      const response = await fetch('/api/enrollments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId, rows }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message ?? 'นำเข้าข้อมูลไม่สำเร็จ');
        setErrors(result.errors ?? []);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success(`ลงทะเบียนนักเรียนแล้ว ${result.createdCount} คน`);
      onClose();
    } catch {
      setMessage('นำเข้าข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>นำเข้าการลงทะเบียนจาก Excel</DialogTitle>
      <DialogContent sx={{ gap: 2, display: 'grid' }}>
        <Typography variant="body2">
          ปีการศึกษา {year} · กรอกรหัสนักเรียนและชื่อห้องตามชีต “ห้องเรียน” เลขที่เว้นว่างได้ รองรับ{' '}
          {ENROLLMENT_IMPORT_LIMIT} รายการต่อไฟล์
        </Typography>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          <Button variant="outlined" disabled={busy} onClick={download}>
            ดาวน์โหลดเทมเพลต
          </Button>
          <Button variant="outlined" disabled={busy} onClick={() => fileInput.current?.click()}>
            เลือกไฟล์ Excel
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            hidden
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void loadFile(file);
            }}
          />
        </Box>
        {fileName ? (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {fileName}
            {rows.length ? ` · ${rows.length} รายการ` : ''}
          </Typography>
        ) : null}
        {message ? (
          <Alert severity="error">
            {message}
            {errors.length ? (
              <Box component="ul" sx={{ my: 0.5, pl: 2.5, maxHeight: 200, overflow: 'auto' }}>
                {errors.map(({ row, message: rowMessage }) => (
                  <li key={row}>
                    แถว {row} · {rowMessage}
                  </li>
                ))}
              </Box>
            ) : null}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          onClick={importRows}
          disabled={busy || !rows.length || !!errors.length}
        >
          ยืนยันนำเข้า
        </Button>
      </DialogActions>
    </Dialog>
  );
}
