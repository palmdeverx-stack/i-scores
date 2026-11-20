'use client';

import type { Subject } from '../subject-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';
import {
  mobileRecordTableSx,
  mobileTablePaginationSx,
} from 'src/components/table/mobile-record-table';

import { listSubjectMasterItems } from 'src/sections/subject-master/subject-master-actions';
import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import { subjectRoutePaths } from '../subject-routing';
import {
  listSubjects,
  deleteSubject,
  createSubject,
  activityTypeLabel,
  uploadSubjectImage,
  STUDENT_DEVELOPMENT_ACTIVITY_CODE,
} from '../subject-actions';

// ----------------------------------------------------------------------

const SUBJECT_SCOPE_LABELS = {
  system: 'ระบบ',
  personal: 'ส่วนตัว',
  school: 'โรงเรียน',
  public: 'สาธารณะ',
} as const;

export function SubjectListView({
  basePath = paths.admin.subject.root,
}: { basePath?: string } = {}) {
  const teacherMobile = basePath === paths.teacher.departmentSubject;
  const router = useRouter();
  const table = useTable({ defaultRowsPerPage: 5 });
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [yearFilter, setYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { create: createPath, edit: editPath } = subjectRoutePaths(basePath);

  const {
    data: allSubjects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['subjects', yearFilter, semesterFilter],
    queryFn: () =>
      listSubjects({
        academicYearId: yearFilter || undefined,
        semesterId: semesterFilter || undefined,
      }),
  });

  const { data: academicYears = [], isLoading: academicYearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });
  const { data: filterSemesters = [], isLoading: filterSemestersLoading } = useQuery({
    queryKey: ['semesters', yearFilter],
    queryFn: () => listSemesters(yearFilter),
    enabled: !!yearFilter,
  });
  const { data: masterItems = [] } = useQuery({
    queryKey: ['subject-master-items'],
    queryFn: () => listSubjectMasterItems('school'),
  });
  const learningAreas = masterItems.filter((item) => item.category === 'learning_area');
  const learningAreaLabel = (code: string | null) =>
    learningAreas.find((item) => item.code === code)?.name ?? code;
  const subjectTypeLabel = (code: string | null) =>
    masterItems.find((item) => item.category === 'subject_type' && item.code === code)?.name ??
    code;
  const educationStageLabel = (code: string | null) =>
    masterItems.find((item) => item.category === 'education_stage' && item.code === code)?.name ??
    code;

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('th');
  const subjects = allSubjects
    .filter((subject) => !areaFilter || subject.learning_area === areaFilter)
    .filter(
      (subject) =>
        !normalizedSearchQuery ||
        subject.name.toLocaleLowerCase('th').includes(normalizedSearchQuery) ||
        subject.code?.toLocaleLowerCase().includes(normalizedSearchQuery)
    );
  const visibleSubjects = rowInPage(subjects, table.page, table.rowsPerPage);

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      table.onUpdatePageDeleteRow(visibleSubjects.length);
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDeletingSubject(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (subject: Subject) => {
      if (subject.scope === 'school' && (!subject.academic_year_id || !subject.semester_id)) {
        throw new Error('ไม่สามารถคัดลอกวิชาที่ยังไม่กำหนดปีการศึกษาหรือภาคเรียนได้');
      }

      const newSubject = await createSubject({
        curriculumId: subject.curriculum_id ?? undefined,
        scope:
          subject.scope === 'system' || subject.scope === 'public' ? 'personal' : subject.scope,
        code: subject.code
          ? `${subject.code}-COPY`
          : `SUBJ-${Date.now().toString(36).toUpperCase()}`,
        name: `${subject.name} (สำเนา)`,
        nameEn: subject.name_en ? `${subject.name_en} (Copy)` : undefined,
        credits: subject.credits,
        studyHours: subject.study_hours,
        description: subject.description ?? undefined,
        descriptionEn: subject.description_en ?? undefined,
        academicYearId: subject.academic_year_id ?? undefined,
        semesterId: subject.semester_id ?? undefined,
        learningArea: subject.learning_area ?? undefined,
        activityType: subject.activity_type ?? undefined,
        subjectType: subject.subject_type ?? undefined,
        educationStage: subject.education_stage ?? undefined,
        gradeLevels: subject.grade_levels,
        learningStandardCode: subject.learning_standard_code ?? undefined,
        learningStandards: subject.learning_standards ?? undefined,
        learningOutcomes: subject.learning_outcomes ?? undefined,
        learningUnits: subject.learning_units ?? undefined,
        indicators: subject.indicators ?? undefined,
        curriculumIndicators: subject.curriculum_indicators.map((indicator) => ({
          code: indicator.code,
          description: indicator.description,
          learningStandard: indicator.learning_standard ?? undefined,
        })),
        learningOutcomesStructured: subject.learning_outcomes_structured.map((item) => ({
          code: item.code ?? undefined,
          description: item.description,
        })),
        learningUnitsStructured: subject.learning_units_structured.map((item) => ({
          code: item.code ?? undefined,
          name: item.name,
          description: item.description ?? undefined,
          estimatedPeriods: item.estimated_periods ?? undefined,
        })),
      });

      if (!subject.image_url) return newSubject;

      try {
        const imageResponse = await fetch(subject.image_url);
        if (!imageResponse.ok) throw new Error('ไม่สามารถคัดลอกรูปภาพวิชาได้');

        const blob = await imageResponse.blob();
        const extension = blob.type === 'image/jpeg' ? 'jpg' : (blob.type.split('/')[1] ?? 'jpg');
        const file = new File([blob], `subject-image.${extension}`, { type: blob.type });

        return await uploadSubjectImage(newSubject.id, file);
      } catch (error) {
        await deleteSubject(newSubject.id);
        throw error;
      }
    },
    onSuccess: async (newSubject) => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(`คัดลอกวิชา "${newSubject.name}" เรียบร้อยแล้ว`);
      router.push(editPath(newSubject.id));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Container maxWidth={false} sx={{ pb: 5, ...(teacherMobile && { px: { xs: 1.5, sm: 3 } }) }}>
      <Box
        sx={{
          mb: teacherMobile ? { xs: 2.5, md: 4 } : 4,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h3"
            sx={
              teacherMobile
                ? { fontSize: (theme) => ({ [theme.breakpoints.down('sm')]: { fontSize: 24 } }) }
                : undefined
            }
          >
            รายวิชาและหลักสูตร
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการรายวิชาของโรงเรียน รายวิชาส่วนตัว และรายวิชาสาธารณะในที่เดียว
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          href={createPath}
          variant="contained"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          sx={
            teacherMobile
              ? { width: { xs: 1, sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' } }
              : undefined
          }
        >
          เพิ่มรายวิชา
        </Button>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          ไม่สามารถโหลดรายการรายวิชาได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box
          sx={{
            gap: 2,
            px: teacherMobile ? { xs: 2, sm: 3 } : 3,
            py: teacherMobile ? { xs: 1.5, sm: 2.5 } : 2.5,
            display: 'flex',
            alignItems: teacherMobile
              ? { xs: 'stretch', xl: 'center' }
              : { xs: 'stretch', md: 'center' },
            flexDirection: teacherMobile
              ? { xs: 'column', xl: 'row' }
              : { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              รายการรายวิชา
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `${subjects.length} รายการ`}
            </Typography>
          </Box>
          <Box
            sx={{
              gap: 1.25,
              display: teacherMobile ? { xs: 'grid', md: 'flex' } : 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: teacherMobile ? 'wrap' : undefined,
              gridTemplateColumns: teacherMobile ? 'repeat(2, minmax(0, 1fr))' : undefined,
            }}
          >
            <TextField
              size="small"
              value={searchQuery}
              placeholder="ค้นหารหัสวิชา หรือชื่อวิชา"
              onChange={(event) => {
                setSearchQuery(event.target.value);
                table.onResetPage();
              }}
              slotProps={{
                input: { startAdornment: <RemixIcon icon="solar:magnifer-linear" width={18} /> },
              }}
              sx={{
                minWidth: teacherMobile ? { xs: 0, md: 220 } : 220,
                gridColumn: teacherMobile ? '1 / -1' : undefined,
              }}
            />
            <TextField
              select
              size="small"
              label="ปีการศึกษา"
              value={yearFilter}
              disabled={academicYearsLoading}
              onChange={(event) => {
                setYearFilter(event.target.value);
                setSemesterFilter('');
                table.onResetPage();
              }}
              sx={{ minWidth: teacherMobile ? { xs: 0, md: 170 } : 170 }}
            >
              <MenuItem value="">ทุกปีการศึกษา</MenuItem>
              {academicYears.map((year) => (
                <MenuItem key={year.id} value={year.id}>
                  {year.year}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="ภาคเรียน"
              value={semesterFilter}
              disabled={!yearFilter || filterSemestersLoading}
              onChange={(event) => {
                setSemesterFilter(event.target.value);
                table.onResetPage();
              }}
              sx={{ minWidth: teacherMobile ? { xs: 0, md: 170 } : 170 }}
            >
              <MenuItem value="">ทุกภาคเรียน</MenuItem>
              {filterSemesters.map((semester) => (
                <MenuItem key={semester.id} value={semester.id}>
                  {semester.name}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              size="small"
              options={learningAreas}
              value={learningAreas.find((area) => area.code === areaFilter) ?? null}
              getOptionKey={(area) => area.code}
              getOptionLabel={(area) => area.name}
              onChange={(_, area) => {
                setAreaFilter(area?.code ?? '');
                table.onResetPage();
              }}
              clearText="ล้างตัวกรองกลุ่มสาระ"
              noOptionsText="ไม่พบกลุ่มสาระ"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="กลุ่มสาระ"
                  placeholder="ทุกกลุ่มสาระ"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
              sx={{
                minWidth: teacherMobile ? { xs: 0, md: 200 } : 200,
                gridColumn: teacherMobile ? '1 / -1' : undefined,
              }}
            />
          </Box>
        </Box>

        <TableContainer>
          <Table sx={teacherMobile ? mobileRecordTableSx : undefined}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { sm: 140 } }}>รหัสวิชา</TableCell>
                <TableCell>รายละเอียดรายวิชา</TableCell>
                <TableCell sx={{ width: 190 }}> ภาคเรียน / ปี </TableCell>
                <TableCell sx={{ width: 170 }}>หน่วยกิต / ชั่วโมง</TableCell>
                <TableCell sx={{ width: 100 }}>สถานะ</TableCell>
                <TableCell sx={{ width: 170 }} align="right">
                  การจัดการ
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !subjects.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีรายวิชา กด “เพิ่มรายวิชา” เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              )}
              {visibleSubjects.map((subject) => (
                <TableRow key={subject.id} hover>
                  <TableCell data-mobile-wide data-mobile-label="รหัสวิชา">
                    <Typography
                      variant="body2"
                      sx={{ color: subject.code ? 'text.primary' : 'text.disabled' }}
                    >
                      {subject.code ?? 'ไม่ระบุ'}
                    </Typography>
                  </TableCell>
                  <TableCell data-mobile-wide>
                    <Box
                      sx={{
                        gap: 1.5,
                        display: 'flex',
                        alignItems: teacherMobile ? { xs: 'flex-start', md: 'center' } : 'center',
                      }}
                    >
                      <Avatar
                        variant="rounded"
                        src={subject.image_url ?? undefined}
                        alt={`รูปวิชา ${subject.name}`}
                        sx={{ width: 56, height: 44, flexShrink: 0, bgcolor: 'background.neutral' }}
                      >
                        <RemixIcon icon="solar:gallery-wide-bold" width={24} />
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            gap: 1,
                            display: 'flex',
                            alignItems: 'center',
                            ...(teacherMobile && { flexWrap: { xs: 'wrap', md: 'nowrap' } }),
                          }}
                        >
                          <Typography variant="subtitle2">{subject.name}</Typography>
                          <Label variant="soft" color="secondary">
                            {SUBJECT_SCOPE_LABELS[subject.scope]}
                          </Label>
                          {subject.name_en && (
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ maxWidth: 420, color: 'text.secondary' }}
                            >
                              - {subject.name_en}
                            </Typography>
                          )}
                        </Box>
                        {(subject.learning_area ||
                          subject.subject_type ||
                          subject.education_stage) && (
                          <Box sx={{ gap: 0.5, mt: 0.5, display: 'flex', flexWrap: 'wrap' }}>
                            {subject.learning_area && (
                              <Label
                                variant="soft"
                                color={
                                  subject.learning_area === STUDENT_DEVELOPMENT_ACTIVITY_CODE
                                    ? 'warning'
                                    : 'info'
                                }
                              >
                                {learningAreaLabel(subject.learning_area)}
                                {subject.activity_type
                                  ? ` · ${activityTypeLabel(subject.activity_type)}`
                                  : ''}
                              </Label>
                            )}
                            {subject.subject_type && (
                              <Label
                                variant="soft"
                                color={subject.subject_type === 'basic' ? 'default' : 'primary'}
                              >
                                {subjectTypeLabel(subject.subject_type)}
                              </Label>
                            )}
                            {subject.education_stage && (
                              <Label variant="soft" color="default">
                                {educationStageLabel(subject.education_stage)}
                              </Label>
                            )}
                          </Box>
                        )}
                        {!!subject.grade_levels.length && (
                          <Typography
                            variant="caption"
                            sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}
                          >
                            ระดับชั้น: {subject.grade_levels.join(', ')}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ maxWidth: 420, display: 'block', color: 'text.secondary' }}
                        >
                          {subject.description || 'ยังไม่มีคำอธิบาย'}
                        </Typography>
                        {subject.description_en && (
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{ maxWidth: 420, display: 'block', color: 'text.disabled' }}
                          >
                            {subject.description_en}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell data-mobile-label="ภาคเรียน / ปี">
                    <Typography variant="body2">
                      {subject.scope === 'school'
                        ? `${subject.semesters?.name ?? 'ยังไม่กำหนดภาคเรียน'} / ${
                            subject.academic_years?.year ?? 'ยังไม่กำหนดปี'
                          }`
                        : 'ไม่ผูกภาคเรียน'}
                    </Typography>
                  </TableCell>
                  <TableCell data-mobile-label="หน่วยกิต / ชั่วโมง">
                    <Typography variant="body2">
                      {Number(subject.credits).toLocaleString('th-TH')} หน่วยกิต
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {Number(subject.study_hours ?? 0).toLocaleString('th-TH')} ชั่วโมง
                    </Typography>
                  </TableCell>
                  <TableCell data-mobile-label="สถานะ">
                    <Label
                      variant="soft"
                      color={subject.status === 'published' ? 'success' : 'default'}
                    >
                      {subject.status === 'published' ? 'เผยแพร่แล้ว' : 'แบบร่าง'}
                    </Label>
                  </TableCell>
                  <TableCell align="right" data-mobile-actions>
                    {subject.can_edit ? (
                      <Tooltip title="แก้ไข">
                        <IconButton
                          size="small"
                          component={RouterLink}
                          href={editPath(subject.id)}
                          aria-label={`แก้ไขวิชา ${subject.name}`}
                        >
                          <RemixIcon icon="solar:pen-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title="คัดลอกวิชา">
                      <IconButton
                        size="small"
                        disabled={duplicateMutation.isPending}
                        onClick={() => duplicateMutation.mutate(subject)}
                        aria-label={`คัดลอกวิชา ${subject.name}`}
                      >
                        <RemixIcon icon="solar:copy-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                    {subject.can_edit ? (
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            deleteMutation.reset();
                            setDeletingSubject(subject);
                          }}
                          aria-label={`ลบวิชา ${subject.name}`}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePaginationCustom
          page={table.page}
          count={subjects.length}
          rowsPerPage={table.rowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          labelRowsPerPage="แสดงต่อหน้า"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
          getItemAriaLabel={(type) => {
            if (type === 'first') return 'หน้าแรก';
            if (type === 'last') return 'หน้าสุดท้าย';
            if (type === 'next') return 'หน้าถัดไป';
            return 'หน้าก่อนหน้า';
          }}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            ...(teacherMobile && mobileTablePaginationSx),
          }}
        />
      </Card>

      <Dialog
        open={!!deletingSubject}
        onClose={() => !deleteMutation.isPending && setDeletingSubject(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบรายวิชา</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">
            ต้องการลบวิชา <strong>{deletingSubject?.name}</strong> ใช่หรือไม่?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            การมอบหมายครู งาน และคะแนนที่เชื่อมโยงกับวิชานี้อาจถูกลบตามไปด้วย
            และไม่สามารถย้อนกลับได้
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingSubject(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingSubject && deleteMutation.mutate(deletingSubject.id)}
          >
            ลบรายวิชา
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
