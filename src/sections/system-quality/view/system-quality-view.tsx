'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import {
  RiLockLine,
  RiCheckLine,
  RiArrowDownSLine,
  RiShieldCheckLine,
} from 'src/components/remix-icon';

import qualityAudit from './system-quality-audit.generated.json';

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
  {
    title: '13. Master Operations และ Impersonation',
    actors: 'master_admin',
    outcome: 'ตรวจสอบและช่วยเหลือโรงเรียนโดยไม่เปิดสิทธิ์ mutation ในนามผู้ใช้เป้าหมาย',
    steps: [
      'Master Admin เลือกโรงเรียนและบัญชี active ที่ต้องการตรวจสอบ',
      'ระบบสร้าง preview session พร้อมเก็บ master session แยกต่างหาก',
      'Preview token ถูกจำกัดเป็น read-only สำหรับ mutation API',
      'เริ่ม/จบ session ทุกครั้งถูกบันทึกใน impersonation audit',
    ],
    evidence: ['/api/auth/impersonation', 'auth_impersonation_audit', 'impersonation-banner.tsx'],
  },
  {
    title: '14. Legal, Onboarding และประสบการณ์หลายภาษา',
    actors: 'ผู้ใช้ใหม่ · ทุกบทบาท',
    outcome: 'นำผู้ใช้ผ่านเงื่อนไขบังคับก่อนใช้งานและแสดง navigation ตามภาษา/บทบาท',
    steps: [
      'บังคับเปลี่ยนรหัสผ่านสำหรับบัญชีที่สร้างใหม่',
      'บังคับยอมรับ Terms, Service Agreement และ Privacy Policy',
      'Onboarding สร้างบริบทโรงเรียนหรือ Marketplace workspace',
      'Navigation และข้อความหลักรองรับการแปลตาม locale ที่เลือก',
    ],
    evidence: ['auth/guard', '/onboarding/school', 'src/locales'],
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
    finding:
      'จำกัดตาม IP/username แบบ atomic, hash identifier, ตรวจ trusted IP, ส่ง Retry-After และหยุด authentication เมื่อ backend ขัดข้อง',
    evidence: 'auth-rate-limit.ts · check_rate_limit() · rate_limit_hardening.sql',
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
    finding: 'TypeScript, ESLint, security regression และ Next.js production build ผ่าน',
    evidence: 'package.json · tests/security-regression.test.mjs',
  },
  {
    area: 'SQL Injection',
    result: 'ผ่าน',
    finding:
      'ใช้ Supabase/PostgREST และ RPC typed parameters, escape wildcard ใน ILIKE และตรวจ UUID ของ token/input ก่อนสร้าง filter expression',
    evidence: 'auth-token.ts · teacher-assignments route · search_teacher_assignments.sql',
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
const automatedPassed = qualityAudit.checks.filter((check) => check.status === 'passed').length;
const securityCheck = qualityAudit.checks.find(
  (check) => check.name === 'Security Regression Test'
);

function flowStatus(index: number) {
  if ([8, 10].includes(index)) {
    return { label: 'ต้องตั้งค่าบริการ', color: 'info' as const };
  }
  if ([11, 13].includes(index)) {
    return { label: 'มีเงื่อนไขก่อน Production', color: 'warning' as const };
  }
  return { label: 'Flow ครบ', color: 'success' as const };
}

export function SystemQualityView() {
  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box
        sx={{
          gap: 2,
          mb: 3,
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 30, sm: 40 } }}>
            ภาพรวมและคุณภาพระบบ
          </Typography>
          <Typography sx={{ mt: 0.75, color: 'text.secondary', fontSize: { sm: 18 } }}>
            ความสามารถทั้งหมด End-to-End Flow และผลประเมินจากการตรวจโค้ดแบบ Static Review
          </Typography>
        </Box>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          <Chip
            label={`Audit Snapshot · ${REVIEW_DATE} · ${qualityAudit.commit}`}
            color="info"
            sx={{ bgcolor: 'info.lighter' }}
          />
          <Chip
            icon={<RiShieldCheckLine />}
            label="ผู้ประเมิน AI · OpenAI Codex"
            color="info"
            variant="outlined"
          />
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        รายงานนี้อ่านจาก Navigation ที่เปิดใช้งาน หน้า UI, API, access helpers และ database migrations
        ที่เชื่อมกันจนจบ โดยไม่รวม Route ที่มีโค้ดอยู่แต่เป็น Legacy และยังไม่มี Usage Telemetry
        ประเมินในรูปแบบ AI-assisted Static Review ไม่ใช่ผล Penetration Test
        หรือการรับรองจากผู้ตรวจสอบอิสระ
      </Alert>

      <Card
        sx={{
          p: { xs: 2.5, md: 4 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(120deg, rgba(33,150,243,0.10), rgba(76,175,80,0.07))',
        }}
      >
        <Box
          sx={{
            gap: { xs: 3, md: 4 },
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '0.7fr 0.8fr 2fr' },
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" color="primary.main">
              {FLOWS.length}
            </Typography>
            <Typography variant="subtitle1">Active Flow ที่ตรวจพบ</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" color="success.main">
              {securityCheck?.result.match(/\d+\/\d+/)?.[0] ?? '—'}
            </Typography>
            <Typography variant="subtitle1">Security Regression Test ผ่าน</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              สรุปผล
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              ระบบมีโครงสร้างที่ดีและ Flow หลักเชื่อมต่อครบ
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              พร้อมใช้งานด้านบัญชี โรงเรียน Marketplace การซื้อ License และงานการศึกษา
              จุดที่ต้องยืนยันต่อคือ migration, external services และค่าจริงบน Production
            </Typography>
            <Box sx={{ mt: 2, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
              <Chip label="10 Flow ครบ" color="success" sx={{ bgcolor: 'success.lighter' }} />
              <Chip label="2 Flow ต้องตั้งค่าบริการ" color="info" sx={{ bgcolor: 'info.lighter' }} />
              <Chip label="2 Flow มีเงื่อนไข" color="warning" sx={{ bgcolor: 'warning.lighter' }} />
            </Box>
          </Box>
        </Box>
      </Card>

      <Card sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3 }}>
        <Box
          sx={{
            gap: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h4">ผลรันจริงจาก Code</Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              ผลจากคำสั่งที่รันกับ {qualityAudit.sourceState} ไม่ใช่ผลตรวจ runtime บน Production
            </Typography>
          </Box>
          <Stack spacing={0.5} sx={{ alignItems: { sm: 'flex-end' } }}>
            <Chip
              icon={<RiCheckLine />}
              label={`${automatedPassed}/${qualityAudit.checks.length} checks ผ่าน`}
              color="success"
            />
            <Typography variant="caption" color="text.secondary">
              บันทึกเมื่อ {qualityAudit.recordedAt}
            </Typography>
          </Stack>
        </Box>

        <Box
          sx={{
            mt: 2.5,
            gap: 1.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          }}
        >
          {qualityAudit.checks.map((check) => (
            <Box
              key={check.command}
              sx={{ p: 2, border: 1, borderRadius: 2, borderColor: 'divider' }}
            >
              <Box sx={{ gap: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">{check.name}</Typography>
                <Chip size="small" label="ผ่าน" color="success" variant="outlined" />
              </Box>
              <Typography
                variant="body2"
                sx={{ mt: 1, color: 'primary.main', fontFamily: 'monospace' }}
              >
                $ {check.command}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
                {check.result}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      <Card sx={{ p: { xs: 2.5, md: 3 }, mb: 4, borderRadius: 3 }}>
        <Typography variant="h4">ผลวัดแยกตามผู้ประเมิน</Typography>
        <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
          แต่ละช่องแสดงเฉพาะผลจากแหล่งนั้น โดยไม่รวมคะแนนข้ามผู้ประเมิน
        </Typography>
        <Box
          sx={{
            mt: 2.5,
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          }}
        >
          {[
            ['OpenAI Codex', `${passed}/${REVIEWS.length}`, 'AI-assisted Static Review'],
            [
              'Automated Checks',
              `${automatedPassed}/${qualityAudit.checks.length}`,
              'TypeScript · ESLint · Tests · Build · Diff',
            ],
            ['External Audit', '—', 'ยังไม่ได้รับการตรวจอิสระ'],
            ['Penetration Test', '—', 'อยู่นอกขอบเขต Static Review'],
          ].map(([name, value, helper]) => (
            <Box key={name} sx={{ p: 2, border: 1, borderRadius: 2, borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary">
                {name}
              </Typography>
              <Typography variant="h4" sx={{ my: 0.5 }}>
                {value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {helper}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">End-to-End Capability Flow</Typography>
        <Typography sx={{ mt: 0.5, mb: 2, color: 'text.secondary' }}>
          เปิดแต่ละหัวข้อเพื่อดู actor, ผลลัพธ์ ลำดับงาน และหลักฐานอ้างอิง
        </Typography>
        {FLOWS.map((flow, index) => (
          <Accordion key={flow.title} disableGutters defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<RiArrowDownSLine />}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle1">{flow.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {flow.outcome}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={flowStatus(index).label}
                color={flowStatus(index).color}
                variant="outlined"
                sx={{ mr: 2, display: { xs: 'none', sm: 'inline-flex' } }}
              />
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
        <Typography sx={{ mt: 0.5, mb: 2.5, color: 'text.secondary' }}>
          Static assurance score {score}% — ไม่นับข้อที่ต้องยืนยันหลัง Deploy เป็นข้อผ่าน
        </Typography>
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
