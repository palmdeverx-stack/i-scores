'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import {
  RiCodeLine,
  RiLockLine,
  RiPulseLine,
  RiFlowChart,
  RiCheckLine,
  RiFileSearchLine,
  RiArrowDownSLine,
  RiShieldCheckLine,
} from 'src/components/remix-icon';

// ----------------------------------------------------------------------

type Flow = {
  title: string;
  actors: string;
  outcome: string;
  steps: readonly string[];
  evidence: readonly string[];
};

type Review = {
  area: string;
  result: 'ผ่าน' | 'ต้องยืนยันหลัง Deploy';
  finding: string;
  evidence: string;
};

const REVIEW_DATE = '3 สิงหาคม 2026';

const FLOWS: readonly Flow[] = [
  {
    title: '1. Identity, Login, SSO และ Session',
    actors: 'ทุกบทบาท · Marketplace user',
    outcome: 'ยืนยันตัวตน สร้าง session และส่งผู้ใช้ไปยังพื้นที่ตาม role อย่างปลอดภัย',
    steps: [
      'รับ username/password, Google identity หรือ Marketplace SSO ticket',
      'ตรวจ rate limit, credential, account/student/school status และสิทธิ์แพ็กเกจ',
      'Master Admin และ School Admin ยืนยัน PIN เพิ่มเติม',
      'ออก JWT ใน HttpOnly/Secure Cookie และตรวจ active session ซ้ำทุก request',
      'รองรับ revoke-all และป้องกัน Marketplace ticket replay ด้วย jti',
    ],
    evidence: ['/api/auth/*', '/auth/marketplace-sso', 'src/proxy.ts'],
  },
  {
    title: '2. โรงเรียน Workspace และ Subscription',
    actors: 'master_admin',
    outcome: 'สร้างโรงเรียน กำหนดสถานะ จำนวนที่นั่ง และความสามารถที่ใช้งานได้',
    steps: [
      'สร้างโรงเรียนหรือ Personal Workspace',
      'เลือกแพ็กเกจและ Capability Bundle',
      'กำหนดวันเริ่ม/หมดอายุ จำนวนผู้ดูแล ครู นักเรียน และ LINE quota',
      'Proxy ตรวจ entitlement ก่อนเปิดหน้าและ API ที่มี feature requirement',
    ],
    evidence: ['/api/schools', '/api/subscription-plans', '/api/capability-bundles'],
  },
  {
    title: '3. ผู้ใช้ ฝ่ายงาน และสิทธิ์การจัดการ',
    actors: 'master_admin · school_admin · หัวหน้าฝ่าย',
    outcome: 'จัดการวงจรชีวิตบัญชีและมอบสิทธิ์แบบ role + department permission',
    steps: [
      'สร้าง/นำเข้าบัญชีผู้ดูแล ครู และนักเรียน',
      'กำหนดฝ่าย สมาชิก หัวหน้าฝ่าย และสิทธิ์รายความสามารถ',
      'ตรวจ seat limit และขอบเขตโรงเรียนก่อน mutation',
      'ปิดบัญชีหรือเปลี่ยน role แล้ว revoke session เดิมโดยอัตโนมัติ',
    ],
    evidence: ['/api/admin/users', '/api/departments', '/api/access-permissions'],
  },
  {
    title: '4. โครงสร้างการศึกษาและตารางเรียน',
    actors: 'school_admin · ครูที่ได้รับสิทธิ์',
    outcome: 'ตั้งปีการศึกษา ภาคเรียน ห้อง วิชา คาบ และอนุมัติตารางเรียนครบวงจร',
    steps: [
      'สร้างปีการศึกษาและภาคเรียน',
      'สร้างห้องเรียน รายวิชา และมอบหมายครูผู้สอน',
      'จัดคาบเรียน ตรวจชนกัน และส่งตารางเพื่ออนุมัติ',
      'ผู้จัดทำและผู้อนุมัติลงลายเซ็น ซึ่งจัดเก็บใน Private Storage',
    ],
    evidence: ['/api/academic-years', '/api/semesters', '/api/schedule-approvals'],
  },
  {
    title: '5. Enrollment และวงจรสถานะนักเรียน',
    actors: 'school_admin · ครูที่ได้รับสิทธิ์',
    outcome: 'นำเด็กเข้าห้อง ย้าย ถอน และเลื่อนชั้นโดยรักษาประวัติเดิม',
    steps: [
      'ค้นหานักเรียนที่ active และกำลังศึกษา',
      'ลงทะเบียนเข้าห้องพร้อมเลขที่',
      'แก้ไข ย้าย ถอน และตรวจความคืบหน้ารายวิชา',
      'เลื่อนชั้นยกชุดเมื่อขึ้นปีการศึกษาใหม่',
    ],
    evidence: ['/api/enrollments', '/api/enrollments/bulk-promote'],
  },
  {
    title: '6. งาน ไฟล์แนบ Quiz และ Gradebook',
    actors: 'teacher · student',
    outcome: 'ครูมอบหมายงาน นักเรียนทำแบบทดสอบ และคะแนนไหลเข้าสมุดคะแนนเดียวกัน',
    steps: [
      'ครูสร้างงานหรือ Quiz พร้อม due date และ rubric คะแนน',
      'ไฟล์แนบเก็บใน Private Storage และดาวน์โหลดผ่าน signed URL 60 วินาที',
      'นักเรียนเริ่ม/ต่อรอบ Quiz และส่งคำตอบ',
      'ระบบตรวจ Quiz อัตโนมัติ หรือครูกรอกคะแนนงานปกติ',
    ],
    evidence: ['/api/teacher-assignments', '/api/student/quizzes', '/api/assignments'],
  },
  {
    title: '7. Grade Review ผลการเรียน และเอกสาร',
    actors: 'teacher · school_admin · student · guardian',
    outcome: 'ส่งผลการเรียนตรวจ อนุมัติ เผยแพร่ และสร้างรายงานที่ตรวจสอบย้อนกลับได้',
    steps: [
      'ครูส่งผลการเรียนเข้ากระบวนการ review',
      'ฝ่ายวิชาการส่งกลับแก้ไขหรืออนุมัติ',
      'เผยแพร่ผลให้นักเรียน และสร้าง PDF/ภาพรายงาน',
      'Guardian share ตรวจ expiry/revocation และนับการดาวน์โหลด',
    ],
    evidence: ['/api/grade-reviews', '/api/guardian/grade-report'],
  },
  {
    title: '8. Attendance รายคาบและหน้าเสาธง',
    actors: 'teacher · student · guardian',
    outcome: 'บันทึกมา/ขาด/ลา/สายจาก QR หรือการกรอกมือและส่งผลไปยังผู้เกี่ยวข้อง',
    steps: [
      'ครูเปิด scan session ตามห้อง วิชา และช่วงเวลา',
      'สแกน QR ที่ active หรือบันทึกหน้าเสาธงด้วยมือ',
      'ระบบป้องกันการสแกนซ้ำและตรวจเวลาสาย/ปิดรอบ',
      'นักเรียนดูประวัติ และเหตุผิดปกติเข้าคิวแจ้งผู้ปกครอง',
    ],
    evidence: ['/api/teacher/attendance-scan', '/api/teacher/homeroom-attendance'],
  },
  {
    title: '9. Notification, LINE, Email และ Webhook',
    actors: 'school_admin · teacher · guardian · ระบบ Cron',
    outcome: 'ส่งข้อความตามเหตุการณ์ พร้อม retry และตรวจลายเซ็นจากผู้ให้บริการ',
    steps: [
      'ตั้งค่า LINE credentials ที่เข้ารหัส AES-256-GCM',
      'สร้าง notification จากประกาศ การเข้าเรียน และ grade reminder',
      'ส่งทันทีและให้ Cron retry รายการค้าง',
      'LINE webhook ตรวจ HMAC signature ก่อนอ่าน payload',
    ],
    evidence: ['/api/line/webhook', '/api/internal/*', '/api/master/email-settings'],
  },
  {
    title: '10. Guardian Portal และการเชื่อมผู้ปกครอง',
    actors: 'teacher · guardian',
    outcome: 'เชื่อม LINE กับนักเรียนและเปิดข้อมูลผ่าน token ที่จำกัดขอบเขต',
    steps: [
      'ครูสร้าง link code หรือ QR สำหรับผู้ปกครอง',
      'Webhook ยืนยันผู้ใช้ LINE และความสัมพันธ์กับนักเรียน',
      'ออก Guardian Portal session cookie แบบ HttpOnly',
      'API จำกัดข้อมูลตาม school/student ที่อยู่ใน token',
    ],
    evidence: ['/api/guardians', '/api/guardian/portal', '/api/guardian/profile'],
  },
  {
    title: '11. Marketplace Purchase, Provisioning และ App Launch',
    actors: 'Marketplace · buyer · school_admin · teacher',
    outcome: 'แปลงการซื้อเป็น license/workspace และเปิดระบบย่อยตาม entitlement จริง',
    steps: [
      'Marketplace ส่ง provisioning request ด้วย shared secret',
      'ตรวจ order item, buyer, plan, scope, feature และวันหมดอายุ',
      'สร้าง/อัปเดต Personal หรือ School Workspace แบบ idempotent',
      'ตรวจ active license, membership และ teacher seat ก่อน launch app',
    ],
    evidence: ['/api/internal/marketplace/provision', '/launch', 'src/lib/ekru-app-access.ts'],
  },
  {
    title: '12. Security, Audit และการปฏิบัติการระบบ',
    actors: 'ระบบ · master_admin',
    outcome: 'มี preventive controls, audit trail และ regression gate ก่อน release',
    steps: [
      'Security headers และ Same-Origin protection ทำงานจากส่วนกลาง',
      'Rate limit แบบ fail-closed และ session/account verification ทุก request',
      'บันทึก auth, account, school, session และ blocked-request audit events',
      'TypeScript, ESLint, security tests และ production build เป็น quality gates',
    ],
    evidence: ['next.config.ts', 'src/proxy.ts', 'tests/security-regression.test.mjs'],
  },
];

const REVIEWS: readonly Review[] = [
  {
    area: 'Session และ Account lifecycle',
    result: 'ผ่าน',
    finding: 'HttpOnly/Secure Cookie, expiry, active-account check และ revoke-all มี enforcement ฝั่ง server',
    evidence: 'auth-token.ts · session-security.ts · proxy.ts',
  },
  {
    area: 'Authorization และ Tenant isolation',
    result: 'ผ่าน',
    finding: 'Route/API ตรวจ role, schoolId, department permission และ entitlement ก่อนเข้าถึงข้อมูล',
    evidence: 'requireRole · access helpers · proxy.ts',
  },
  {
    area: 'CSRF / Same-Origin',
    result: 'ผ่าน',
    finding: 'Mutation API ปฏิเสธ cross-site Origin/Sec-Fetch-Site และยกเว้นเฉพาะ trusted integrations',
    evidence: 'request-security.ts · proxy.ts',
  },
  {
    area: 'Brute-force protection',
    result: 'ผ่าน',
    finding: 'จำกัดตาม IP/username แบบ atomic และหยุด authentication เมื่อ rate-limit backend ขัดข้อง',
    evidence: 'auth-rate-limit.ts · check_rate_limit()',
  },
  {
    area: 'Sensitive credentials',
    result: 'ผ่าน',
    finding: 'LINE credentials และ recovery credential ใช้ AES-256-GCM; password authentication ใช้ bcrypt/Supabase Auth',
    evidence: 'credential-cipher.ts · line-credentials.ts',
  },
  {
    area: 'Private files และ Signed URL',
    result: 'ผ่าน',
    finding: 'Assignment attachments และลายเซ็นเป็น private; signed URL อายุ 60 วินาทีออกหลังตรวจสิทธิ์',
    evidence: 'private-storage.ts · attachments download route',
  },
  {
    area: 'Webhook และ Internal API',
    result: 'ผ่าน',
    finding: 'LINE ใช้ HMAC + timing-safe compare; Marketplace/Internal jobs ใช้ secret ที่ fail closed',
    evidence: 'line/webhook · marketplace-internal-auth.ts · cron-auth.ts',
  },
  {
    area: 'Security headers',
    result: 'ผ่าน',
    finding: 'CSP, HSTS, frame protection, nosniff, referrer และ permissions policy ถูกกำหนดทั่วระบบ',
    evidence: 'next.config.ts',
  },
  {
    area: 'Auditability',
    result: 'ผ่าน',
    finding: 'มี security audit table แบบ RLS และบันทึกเหตุการณ์ auth/session/account/cross-site ที่สำคัญ',
    evidence: 'security-audit.ts · security_hardening.sql',
  },
  {
    area: 'Static quality gates',
    result: 'ผ่าน',
    finding: 'TypeScript, ESLint, security regression 6/6 และ Next.js production build ผ่าน',
    evidence: 'package.json · tests/security-regression.test.mjs',
  },
  {
    area: 'Database rollout',
    result: 'ต้องยืนยันหลัง Deploy',
    finding: 'ต้องตรวจว่า security hardening migration ถูก apply ก่อนรับ traffic ของ release ใหม่',
    evidence: '20260803020000_security_hardening.sql',
  },
  {
    area: 'Production configuration',
    result: 'ต้องยืนยันหลัง Deploy',
    finding: 'Static review ไม่ยืนยันค่า secret, Vercel Git Integration, Cron plan และ runtime headers บน production',
    evidence: 'Vercel Project Settings · Production environment',
  },
];

const passed = REVIEWS.filter((review) => review.result === 'ผ่าน').length;
const score = Math.round((passed / REVIEWS.length) * 100);

function MetricCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card sx={{ p: 2.5, minWidth: 0 }}>
      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 42, height: 42, display: 'grid', borderRadius: 1.5, placeItems: 'center', color: 'primary.main', bgcolor: 'primary.lighter' }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5">{value}</Typography>
          <Typography variant="subtitle2">{label}</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>{helper}</Typography>
    </Card>
  );
}

export function SystemQualityView() {
  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Card sx={{ p: { xs: 2.5, sm: 4 }, mb: 3, overflow: 'hidden', color: 'common.white', position: 'relative', borderRadius: 3, background: 'linear-gradient(135deg, #102A43 0%, #00695C 100%)' }}>
        <Box sx={{ maxWidth: 760, position: 'relative', zIndex: 1 }}>
          <Chip icon={<RiShieldCheckLine />} label="Master Admin only" sx={{ mb: 2, color: 'common.white', bgcolor: 'rgba(255,255,255,0.14)', '& .MuiChip-icon': { color: 'inherit' } }} />
          <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 28, sm: 38 } }}>ภาพรวมและคุณภาพระบบ</Typography>
          <Typography sx={{ mt: 1.5, maxWidth: 720, opacity: 0.84 }}>
            ความสามารถทั้งหมดในมุม End-to-End ตั้งแต่ผู้ใช้ หน้าเว็บ API ฐานข้อมูล ไปจนถึง integration พร้อมผลประเมินจาก Static Review ของ source code ปัจจุบัน
          </Typography>
          <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.72 }}>ตรวจล่าสุด: {REVIEW_DATE} · Scope: application code, API routes, proxy และ database migrations</Typography>
        </Box>
        <RiPulseLine size={190} style={{ right: -30, bottom: -50, opacity: 0.08, position: 'absolute' }} />
      </Card>

      <Box sx={{ mb: 4, gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        <MetricCard icon={<RiFlowChart />} label="Capability domains" value={String(FLOWS.length)} helper="ครอบคลุม flow ธุรกิจและระบบสนับสนุน" />
        <MetricCard icon={<RiFileSearchLine />} label="Static controls" value={`${passed}/${REVIEWS.length}`} helper="ผ่านจากหลักฐานใน source code" />
        <MetricCard icon={<RiShieldCheckLine />} label="Static score" value={`${score}%`} helper="ไม่นับ runtime verification เป็นข้อผ่าน" />
        <MetricCard icon={<RiCodeLine />} label="Build blockers" value="0" helper="TypeScript, ESLint, tests และ build ผ่าน" />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">End-to-End Capability Flow</Typography>
        <Typography sx={{ mt: 0.5, mb: 2, color: 'text.secondary' }}>เปิดแต่ละหัวข้อเพื่อดู actor, ผลลัพธ์, ลำดับงาน และจุดอ้างอิงในระบบ</Typography>
        {FLOWS.map((flow, index) => (
          <Accordion key={flow.title} disableGutters defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<RiArrowDownSLine />}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1">{flow.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{flow.outcome}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Chip size="small" color="info" variant="outlined" label={`ผู้เกี่ยวข้อง: ${flow.actors}`} sx={{ mb: 2 }} />
              <Stack spacing={1.25}>
                {flow.steps.map((step, stepIndex) => (
                  <Box key={step} sx={{ gap: 1, display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{ width: 24, height: 24, display: 'grid', flexShrink: 0, borderRadius: '50%', placeItems: 'center', color: 'primary.contrastText', bgcolor: 'primary.main', fontSize: 12 }}>{stepIndex + 1}</Box>
                    <Typography variant="body2" sx={{ pt: 0.25 }}>{step}</Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ mt: 2, gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
                {flow.evidence.map((item) => <Chip key={item} size="small" variant="outlined" label={item} sx={{ fontFamily: 'monospace', fontSize: 11 }} />)}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box>
        <Typography variant="h4">ผลประเมินจาก Static Review</Typography>
        <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>ผลนี้ยืนยันสิ่งที่มองเห็นได้จากโค้ด ไม่แทน penetration test, dependency scan หรือ runtime verification บน production</Typography>
        <Card sx={{ p: 2.5, my: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="subtitle1">Static assurance score</Typography><Typography variant="h5" color="success.main">{score}%</Typography></Box>
          <LinearProgress variant="determinate" value={score} color="success" sx={{ mt: 1.5, height: 8, borderRadius: 1 }} />
        </Card>
        <Stack spacing={1.25}>
          {REVIEWS.map((review) => {
            const isPassed = review.result === 'ผ่าน';
            return (
              <Card key={review.area} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ gap: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1">{review.area}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>{review.finding}</Typography>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.disabled', fontFamily: 'monospace' }}>{review.evidence}</Typography>
                  </Box>
                  <Chip icon={isPassed ? <RiCheckLine /> : <RiLockLine />} label={review.result} color={isPassed ? 'success' : 'warning'} variant={isPassed ? 'filled' : 'outlined'} sx={{ flexShrink: 0 }} />
                </Box>
              </Card>
            );
          })}
        </Stack>
      </Box>

      <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
        ก่อนถือว่าระบบผ่าน production review ต้อง apply migration, ตรวจ environment secrets, ยิง smoke test ที่ deployment จริง และยืนยันว่า Vercel ส่ง security headers/cron ตาม Project Settings
      </Alert>
    </Container>
  );
}
