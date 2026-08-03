'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Snackbar from '@mui/material/Snackbar';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

type WorksheetAiViewProps = {
  workspaceId: string;
};

type Worksheet = {
  id: number;
  title: string;
  subject: string;
  level: string;
  questions: number;
  updatedAt: string;
  status: 'พร้อมใช้' | 'ฉบับร่าง';
  color: string;
  icon: string;
};

const WORKSHEETS: Worksheet[] = [
  {
    id: 1,
    title: 'ระบบสุริยะและดาวเคราะห์',
    subject: 'วิทยาศาสตร์',
    level: 'ป.4',
    questions: 10,
    updatedAt: 'วันนี้ 10:24 น.',
    status: 'พร้อมใช้',
    color: '#6C5CE7',
    icon: 'solar:planet-3-bold-duotone',
  },
  {
    id: 2,
    title: 'การบวกและลบเศษส่วน',
    subject: 'คณิตศาสตร์',
    level: 'ป.5',
    questions: 15,
    updatedAt: 'เมื่อวาน 16:40 น.',
    status: 'ฉบับร่าง',
    color: '#00897B',
    icon: 'solar:calculator-bold-duotone',
  },
  {
    id: 3,
    title: 'คำราชาศัพท์ในชีวิตประจำวัน',
    subject: 'ภาษาไทย',
    level: 'ม.1',
    questions: 12,
    updatedAt: '1 ส.ค. 2569',
    status: 'พร้อมใช้',
    color: '#E67E22',
    icon: 'solar:book-2-bold-duotone',
  },
  {
    id: 4,
    title: 'Present Simple Tense',
    subject: 'ภาษาอังกฤษ',
    level: 'ป.6',
    questions: 20,
    updatedAt: '30 ก.ค. 2569',
    status: 'พร้อมใช้',
    color: '#2878D0',
    icon: 'solar:global-bold-duotone',
  },
];

const TEMPLATES = [
  {
    title: 'แบบฝึกทักษะ',
    description: 'โจทย์แบบเลือกตอบและเติมคำ พร้อมเฉลย',
    prompt: 'สร้างแบบฝึกทักษะเรื่องการคูณ สำหรับนักเรียน ป.3 จำนวน 10 ข้อ พร้อมเฉลย',
    color: '#6C5CE7',
    icon: 'solar:pen-new-square-bold-duotone',
  },
  {
    title: 'ใบงานจากบทเรียน',
    description: 'สรุปเนื้อหาแล้วสร้างคำถามวัดความเข้าใจ',
    prompt: 'สร้างใบงานสรุปบทเรียนเรื่องการเปลี่ยนสถานะของสสาร สำหรับ ป.5',
    color: '#00897B',
    icon: 'solar:notebook-bold-duotone',
  },
  {
    title: 'ข้อสอบท้ายบท',
    description: 'ผสมหลายรูปแบบและกำหนดระดับความยาก',
    prompt: 'สร้างข้อสอบท้ายบทภาษาอังกฤษ ม.1 เรื่อง Present Simple จำนวน 20 ข้อ',
    color: '#E67E22',
    icon: 'solar:clipboard-check-bold-duotone',
  },
];

const STATS = [
  {
    label: 'ใบงานทั้งหมด',
    value: '24',
    detail: '+6 เดือนนี้',
    icon: 'solar:documents-bold-duotone',
  },
  {
    label: 'พร้อมนำไปใช้',
    value: '18',
    detail: '75% ของทั้งหมด',
    icon: 'solar:check-circle-bold-duotone',
  },
  {
    label: 'เวลาที่ประหยัด',
    value: '8.5 ชม.',
    detail: 'โดยประมาณ',
    icon: 'solar:clock-circle-bold-duotone',
  },
];

// ----------------------------------------------------------------------

export function WorksheetAiView({ workspaceId }: WorksheetAiViewProps) {
  const [prompt, setPrompt] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const keyword = search.trim().toLocaleLowerCase('th');
  const visibleWorksheets = keyword
    ? WORKSHEETS.filter((worksheet) =>
        [worksheet.title, worksheet.subject, worksheet.level]
          .join(' ')
          .toLocaleLowerCase('th')
          .includes(keyword)
      )
    : WORKSHEETS;

  const handleGenerate = () => {
    if (!prompt.trim()) {
      setNotice('ลองพิมพ์หัวข้อหรือคำสั่งที่ต้องการก่อน');
      return;
    }
    setNotice('นี่คือหน้าตัวอย่าง — ระบบพร้อมนำคำสั่งนี้ไปสร้างใบงานเมื่อเชื่อม AI');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F7FB', color: '#172033' }}>
      <Box
        component="header"
        sx={{
          top: 0,
          zIndex: 10,
          position: 'sticky',
          bgcolor: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid',
          borderColor: '#E8EAF1',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            minHeight: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 42,
                height: 42,
                color: 'white',
                bgcolor: '#6C5CE7',
                boxShadow: '0 8px 18px rgba(108,92,231,0.25)',
              }}
            >
              <RemixIcon icon="solar:magic-stick-3-bold-duotone" width={25} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.15, fontWeight: 800 }}>
                Worksheet AI
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ผู้ช่วยสร้างใบงานสำหรับคุณครู
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label="ข้อมูลตัวอย่าง"
              color="warning"
              variant="outlined"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            />
            <Button
              color="inherit"
              href="/teacher"
              startIcon={<RemixIcon icon="solar:arrow-left-linear" />}
              sx={{ color: 'text.secondary' }}
            >
              กลับ eKru
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Paper
          id="create"
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4, md: 5 },
            color: 'white',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 4,
            background: 'linear-gradient(125deg, #5B4BD5 0%, #7B61E8 58%, #9B7AF4 100%)',
            boxShadow: '0 20px 50px rgba(91,75,213,0.22)',
            '&::after': {
              content: '""',
              width: 340,
              height: 340,
              right: -100,
              top: -210,
              borderRadius: '50%',
              position: 'absolute',
              bgcolor: 'rgba(255,255,255,0.09)',
            },
          }}
        >
          <Box sx={{ maxWidth: 820, position: 'relative', zIndex: 1 }}>
            <Chip
              size="small"
              icon={<RemixIcon icon="solar:stars-bold-duotone" />}
              label="AI Worksheet Generator"
              sx={{
                mb: 2,
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.16)',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
            <Typography
              component="h1"
              sx={{ fontSize: { xs: 28, sm: 38 }, fontWeight: 800, lineHeight: 1.2 }}
            >
              วันนี้อยากสร้างใบงานเรื่องอะไร?
            </Typography>
            <Typography
              sx={{ mt: 1, mb: 3, color: 'rgba(255,255,255,0.78)', fontSize: { xs: 14, sm: 16 } }}
            >
              บอกหัวข้อ ระดับชั้น และรูปแบบคำถาม แล้ว AI จะช่วยร่างใบงานพร้อมเฉลยให้
            </Typography>
            <Paper
              elevation={0}
              sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'flex-end', borderRadius: 2.5 }}
            >
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="เช่น สร้างใบงานเรื่องระบบสุริยะ สำหรับ ป.4 จำนวน 10 ข้อ มีทั้งปรนัยและเติมคำ..."
                slotProps={{ input: { sx: { '& fieldset': { border: 0 } } } }}
              />
              <Button
                variant="contained"
                onClick={handleGenerate}
                startIcon={<RemixIcon icon="solar:magic-stick-3-bold-duotone" />}
                sx={{
                  px: { xs: 2, sm: 3 },
                  py: 1.35,
                  mb: 0.35,
                  whiteSpace: 'nowrap',
                  bgcolor: '#172033',
                  '&:hover': { bgcolor: '#27324A' },
                }}
              >
                สร้างใบงาน
              </Button>
            </Paper>
          </Box>
        </Paper>

        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          {STATS.map((stat) => (
            <Paper
              key={stat.label}
              elevation={0}
              sx={{ p: 2.5, borderRadius: 3, border: '1px solid #EAECF2' }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{ width: 48, height: 48, color: '#6C5CE7', bgcolor: '#F0EDFF' }}
                >
                  <RemixIcon icon={stat.icon} width={25} />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {stat.label}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#0F9D78' }}>
                      {stat.detail}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>

        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 350px' },
          }}
        >
          <Paper
            elevation={0}
            sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid #EAECF2' }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              sx={{ mb: 2.5 }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ใบงานล่าสุด
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  กลับมาแก้ไข ดาวน์โหลด หรือทำสำเนาได้ทุกเมื่อ
                </Typography>
              </Box>
              <TextField
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาใบงาน"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <RemixIcon icon="solar:magnifer-linear" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: { xs: '100%', sm: 220 } }}
              />
            </Stack>

            <Stack spacing={1.25}>
              {visibleWorksheets.map((worksheet) => (
                <Box
                  key={worksheet.id}
                  sx={{
                    p: 1.5,
                    gap: 1.5,
                    display: 'grid',
                    alignItems: 'center',
                    borderRadius: 2,
                    gridTemplateColumns: {
                      xs: '48px minmax(0, 1fr) auto',
                      md: '48px minmax(0, 1fr) 120px 110px auto',
                    },
                    '&:hover': { bgcolor: '#F8F8FC' },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 48,
                      height: 48,
                      color: worksheet.color,
                      bgcolor: `${worksheet.color}16`,
                    }}
                  >
                    <RemixIcon icon={worksheet.icon} width={25} />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 700 }}>
                      {worksheet.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {worksheet.subject} · {worksheet.level} · {worksheet.questions} ข้อ
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={worksheet.status}
                    sx={{
                      display: { xs: 'none', md: 'inline-flex' },
                      color: worksheet.status === 'พร้อมใช้' ? '#087A5B' : '#9A6412',
                      bgcolor: worksheet.status === 'พร้อมใช้' ? '#E8F7F1' : '#FFF4D8',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ display: { xs: 'none', md: 'block' }, color: 'text.secondary' }}
                  >
                    {worksheet.updatedAt}
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    aria-label={`เปิด ${worksheet.title}`}
                    onClick={() => setNotice(`เปิดตัวอย่าง “${worksheet.title}”`)}
                    sx={{ minWidth: 38, color: 'text.secondary' }}
                  >
                    <RemixIcon icon="solar:arrow-right-linear" />
                  </Button>
                </Box>
              ))}
              {visibleWorksheets.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  <RemixIcon icon="solar:file-search-bold-duotone" width={38} />
                  <Typography sx={{ mt: 1 }}>ไม่พบใบงานที่ค้นหา</Typography>
                </Box>
              ) : null}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #EAECF2' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              เริ่มจากเทมเพลต
            </Typography>
            <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
              เลือกโครงสร้าง แล้วปรับหัวข้อได้ตามต้องการ
            </Typography>
            <Stack spacing={1.5}>
              {TEMPLATES.map((template) => (
                <Button
                  key={template.title}
                  color="inherit"
                  onClick={() => {
                    setPrompt(template.prompt);
                    document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  sx={{
                    p: 1.5,
                    gap: 1.5,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    border: '1px solid #EAECF2',
                    borderRadius: 2.5,
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 42,
                      height: 42,
                      color: template.color,
                      bgcolor: `${template.color}16`,
                    }}
                  >
                    <RemixIcon icon={template.icon} width={22} />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
                      {template.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: 'text.secondary',
                        lineHeight: 1.45,
                        textTransform: 'none',
                      }}
                    >
                      {template.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
            <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #EAECF2' }}>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                Workspace ID
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  fontFamily: 'monospace',
                  color: '#657087',
                  overflowWrap: 'anywhere',
                }}
              >
                {workspaceId}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>

      <Snackbar open={Boolean(notice)} autoHideDuration={3500} onClose={() => setNotice('')}>
        <Alert severity="info" variant="filled" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
