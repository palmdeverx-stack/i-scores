import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('authentication cookie remains server-only and time-limited', () => {
  const source = read('src/lib/auth-token.ts');
  assert.match(source, /httpOnly:\s*true/);
  assert.match(source, /secure:\s*process\.env\.NODE_ENV\s*===\s*'production'/);
  assert.match(source, /sameSite:\s*'lax'/);
  assert.match(source, /maxAge:\s*ACCESS_TOKEN_MAX_AGE_SECONDS/);
});

test('rate limit fails closed on infrastructure errors', () => {
  const source = read('src/lib/auth-rate-limit.ts');
  const errorBranch = source.slice(source.indexOf('if (error)'));
  assert.match(errorBranch, /return false/);
  assert.doesNotMatch(errorBranch.slice(0, errorBranch.indexOf('return data')), /return true/);
});

test('rate limit uses trusted IPs, hashed bounded keys and atomic counters', () => {
  const source = read('src/lib/auth-rate-limit.ts');
  const signIn = read('src/app/api/auth/sign-in/route.ts');
  const verifyPin = read('src/app/api/auth/verify-pin/route.ts');
  const migration = read('supabase/migrations/20260803030000_rate_limit_hardening.sql');

  assert.match(source, /x-vercel-forwarded-for/);
  assert.match(source, /isIP\(candidate\)/);
  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /slice\(0, 320\)\.toLowerCase\(\)/);
  assert.match(signIn, /'Retry-After': String\(AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS\)/);
  assert.match(verifyPin, /'Retry-After': String\(AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS\)/);
  assert.match(migration, /length\(p_identifier\) > 100/);
  assert.match(migration, /p_max_attempts > 1000/);
  assert.match(migration, /on conflict \(identifier\) do update/);
  assert.match(migration, /grant execute .* to service_role/);
});

test('proxy enforces same-origin mutations and active sessions', () => {
  const proxy = read('src/proxy.ts');
  const requestSecurity = read('src/lib/request-security.ts');
  assert.match(proxy, /isCrossSiteMutation\(request\)/);
  assert.match(proxy, /isActiveSession\(caller\)/);
  assert.match(requestSecurity, /sec-fetch-site/);
  assert.match(requestSecurity, /origin/);
});

test('global security headers remain configured', () => {
  const source = read('next.config.ts');
  for (const header of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ]) {
    assert.match(source, new RegExp(header));
  }
});

test('sensitive storage is private and downloads use short-lived signed URLs', () => {
  const migration = read('supabase/migrations/20260803020000_security_hardening.sql');
  const download = read('src/app/api/assignments/attachments/[id]/download/route.ts');
  const signatures = read('src/lib/private-storage.ts');
  assert.match(migration, /assignment-attachments', 'schedule-approval-signatures/);
  assert.match(migration, /set public = false/);
  assert.match(download, /createSignedUrl\(attachment\.storage_path, 60/);
  assert.match(signatures, /createSignedUrl\(path, 60\)/);
});

test('session revocation and security audit schema remain present', () => {
  const migration = read('supabase/migrations/20260803020000_security_hardening.sql');
  assert.match(migration, /session_revoked_at/);
  assert.match(migration, /create table if not exists public\.security_audit_log/);
  assert.match(migration, /enable row level security/);
});

test('database access remains parameterized and SQL injection guarded', () => {
  const authToken = read('src/lib/auth-token.ts');
  const assignmentRoute = read('src/app/api/teacher-assignments/route.ts');
  const searchFunction = read(
    'supabase/migrations/20260724010000_search_teacher_assignments.sql'
  );
  const sourceFiles = fs
    .readdirSync(path.join(root, 'src'), { recursive: true })
    .filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file))
    .map((file) => read(path.join('src', file)))
    .join('\n');

  assert.match(authToken, /UUID_PATTERN\.test\(payload\.sub\)/);
  assert.match(authToken, /algorithms:\s*\['HS256'\]/);
  assert.match(assignmentRoute, /searchParams\.get\('search'\).*slice\(0, 200\)/);
  assert.match(assignmentRoute, /UUID_PATTERN\.test\(classroomId\)/);
  assert.match(searchFunction, /p_search text default null/);
  assert.match(searchFunction, /replace\(replace\(replace\(p_search/);
  assert.doesNotMatch(searchFunction, /^\s*execute\s/im);
  assert.doesNotMatch(
    sourceFiles,
    /\$queryRawUnsafe|\$executeRawUnsafe|sequelize\.query|knex\.raw|\.unsafe\s*\(/
  );
});

test('Vercel Hobby cron stays within limits and isolates sequential task failures', () => {
  const config = JSON.parse(read('vercel.json'));
  const route = read('src/app/api/internal/cron/daily/[slot]/route.ts');
  const legacyCronRoutes = [
    'src/app/api/internal/line-notifications/process/route.ts',
    'src/app/api/internal/grade-reminders/process/route.ts',
    'src/app/api/internal/school-holiday-announcements/process/route.ts',
  ].map(read);
  const tasks = read('src/lib/cron-tasks.ts');
  const cronAuth = read('src/lib/cron-auth.ts');

  assert.equal(config.crons.length, 2);
  assert.deepEqual(
    config.crons.map((cron) => cron.schedule),
    ['0 2 * * *', '0 8 * * *']
  );
  assert.ok(config.crons.every((cron) => cron.path.startsWith('/api/internal/cron/daily/')));
  assert.match(route, /isValidCronSecret\(request\)/);
  assert.ok(legacyCronRoutes.every((source) => /isValidCronSecret\(request\)/.test(source)));
  assert.match(cronAuth, /`Bearer \$\{cronSecret\}`/);
  assert.match(tasks, /for \(const task of tasksForSlot\(slot\)\)/);
  assert.match(tasks, /try \{[\s\S]*await task\.run\(\)[\s\S]*\} catch \(taskError\)/);
  assert.doesNotMatch(tasks, /Promise\.all\(/);
});
