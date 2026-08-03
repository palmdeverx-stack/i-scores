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

test('Google authentication exchanges a bearer token for an app session', () => {
  const route = read('src/app/api/auth/google/route.ts');
  const meRoute = read('src/app/api/auth/me/route.ts');
  const changePasswordRoute = read('src/app/api/auth/change-password/route.ts');
  const teacherProfile = read('src/sections/teacher-profile/view/teacher-profile-view.tsx');
  const button = read('src/auth/components/google-auth-button.tsx');
  const callback = read('src/app/auth/google/callback/page.tsx');

  assert.match(route, /headers\.get\('authorization'\)/);
  assert.match(route, /supabaseAdmin\.auth\.getUser\(accessToken\)/);
  assert.doesNotMatch(route, /body\?\.accessToken/);
  assert.match(route, /\.in\('supported_scope', \['individual', 'both'\]\)/);
  assert.match(route, /SUPABASE_TOKEN_MISSING/);
  assert.match(route, /SUPABASE_TOKEN_INVALID/);
  assert.doesNotMatch(route, /console\.(?:log|error)\([^\n]*accessToken/);
  assert.match(button, /Authorization: `Bearer \$\{data\.session\.access_token\}`/);
  assert.match(callback, /Authorization: `Bearer \$\{data\.session\.access_token\}`/);
  assert.match(button, /credentials: 'include'/);
  assert.match(callback, /credentials: 'include'/);
  assert.match(button, /await checkUserSession\?\.\(\)/);
  assert.match(callback, /await checkUserSession\?\.\(\)/);
  assert.match(route, /authProvider: 'google'/);
  assert.match(meRoute, /resolveAuthProvider\(payload\.authProvider/);
  assert.match(meRoute, /auth_provider: authProvider/);
  assert.match(changePasswordRoute, /payload\.authProvider === 'google'/);
  assert.match(teacherProfile, /เข้าสู่ระบบด้วย Google/);
  assert.match(teacherProfile, /บัญชีนี้จัดการรหัสผ่านผ่าน Google/);
});

test('admin sessions are only issued after PIN verification', () => {
  const googleRoute = read('src/app/api/auth/google/route.ts');
  const passwordRoute = read('src/app/api/auth/sign-in/route.ts');
  const verifyPinRoute = read('src/app/api/auth/verify-pin/route.ts');

  assert.match(
    googleRoute,
    /appUser\.role === 'master_admin' \|\| appUser\.role === 'school_admin'/
  );
  assert.match(googleRoute, /response\.cookies\.delete\(ACCESS_TOKEN_COOKIE\)/);
  assert.match(passwordRoute, /response\.cookies\.delete\(ACCESS_TOKEN_COOKIE\)/);
  assert.match(verifyPinRoute, /response\.cookies\.set\(ACCESS_TOKEN_COOKIE, accessToken/);
});

test('Google login recovers paid personal licenses that skipped provisioning', () => {
  const googleRoute = read('src/app/api/auth/google/route.ts');
  const recovery = read('src/lib/personal-workspace-provisioning.ts');

  assert.match(googleRoute, /recoverPersonalWorkspacePurchases\(authUser\.id\)/);
  assert.match(recovery, /marketplace_user_licenses/);
  assert.match(recovery, /marketplace_provision_events/);
  assert.match(recovery, /provision_personal_workspace_purchase/);
  assert.match(recovery, /finalizePersonalWorkspace/);
  assert.doesNotMatch(recovery, /from\('subjects'\)\.upsert/);
  assert.match(recovery, /\.eq\('auth_user_id', authUserId\)/);
  assert.match(recovery, /\.eq\('school_id', schoolId\)/);
});

test('personal workspaces use product branding instead of school branding', () => {
  const verticalNav = read('src/layouts/dashboard/nav-vertical.tsx');
  const headerIdentity = read('src/layouts/dashboard/school-header-identity.tsx');
  const mobileBrand = read('src/layouts/main/school-brand.tsx');
  const teacherLayout = read('src/app/teacher/layout.tsx');
  const departmentAccess = read('src/lib/department-permission-access.ts');
  const studentList = read('src/sections/user/view/student-list-view.tsx');

  assert.match(verticalNav, /isMasterAdmin \|\| user\?\.is_personal_workspace === true/);
  assert.match(verticalNav, /usesProductIdentity \? \(/);
  assert.match(headerIdentity, /if \(isPersonalWorkspace\)/);
  assert.match(headerIdentity, /<Typography variant="subtitle1">eKru<\/Typography>/);
  assert.match(mobileBrand, /isPersonalWorkspace \|\| !school\?\.logo_url/);
  assert.match(teacherLayout, /group\.items\.map\(\(item\) =>/);
  assert.match(teacherLayout, /item\.title === 'นักเรียนของฉัน'/);
  assert.doesNotMatch(teacherLayout, /departmentAcademicYear|departmentStudent/);
  assert.match(
    teacherLayout,
    /if \(user\?\.is_personal_workspace\) return dedupeTeacherNav\(licensedNav\)/
  );
  assert.match(departmentAccess, /school\?\.workspace_type === 'personal'/);
  assert.match(departmentAccess, /school\.owner_auth_user_id === teacher\.auth_user_id/);
  assert.match(departmentAccess, /return \[\.\.\.DEPARTMENT_PERMISSION_KEYS\]/);
  assert.match(studentList, /manage_permissions \?\? \[\]\)\.includes\('students\.manage'\)/);
});

test('one identity can switch isolated workspaces and carry personal teacher licenses', () => {
  const migration = read('supabase/migrations/20260803110000_workspace_switching.sql');
  const meRoute = read('src/app/api/auth/me/route.ts');
  const switchRoute = read('src/app/api/auth/switch-workspace/route.ts');
  const entitlements = read('src/lib/school-subscription.ts');
  const accountPopover = read('src/layouts/components/account-popover.tsx');

  assert.match(migration, /app_users_auth_user_workspace_key/);
  assert.match(migration, /accept_marketplace_school_invitation/);
  assert.match(migration, /auth_user_id = current_marketplace_user\.auth_user_id/);
  assert.match(meRoute, /active_workspace_profile_id: user\.id/);
  assert.match(meRoute, /workspaces/);
  assert.match(switchRoute, /getWorkspaceProfile\(profileId, currentUser\.auth_user_id\)/);
  assert.match(switchRoute, /response\.cookies\.set\(ACCESS_TOKEN_COOKIE/);
  assert.match(entitlements, /marketplace_user_licenses/);
  assert.match(entitlements, /activePersonalLicenses: personalLicenses/);
  assert.match(accountPopover, /handleWorkspaceSwitch/);
  assert.match(accountPopover, /พื้นที่ใช้งาน/);
});

test('editing a subscription plan synchronizes active issued entitlements', () => {
  const route = read('src/app/api/subscription-plans/[id]/route.ts');
  const payload = read('src/app/api/subscription-plans/plan-payload.ts');
  const migration = read('supabase/migrations/20260803120000_sync_plan_entitlements.sql');
  const reconciliation = read(
    'supabase/migrations/20260803130000_reconcile_bundle_plan_entitlements.sql'
  );
  const teacherNav = read('src/layouts/nav-config-teacher.tsx');
  const bundleSelector = read(
    'src/sections/subscription-plan/components/capability-bundle-selector.tsx'
  );
  const subscriptionLoader = read('src/lib/school-subscription.ts');
  const subscriptionHook = read('src/sections/school-subscription/use-school-subscription.ts');
  const subscriptionActions = read(
    'src/sections/school-subscription/school-subscription-actions.ts'
  );

  assert.match(route, /update_subscription_plan_with_entitlements/);
  assert.match(migration, /for update/);
  assert.match(migration, /update public\.marketplace_products/);
  assert.match(migration, /update public\.marketplace_user_licenses/);
  assert.match(migration, /update public\.marketplace_school_licenses/);
  assert.match(migration, /update public\.school_subscriptions/);
  assert.match(migration, /where status = 'active'/);
  assert.match(migration, /grant execute .*service_role/s);
  assert.match(reconciliation, /jsonb_array_elements\(plan_record\.source_bundles\)/);
  assert.match(reconciliation, /update_subscription_plan_with_entitlements/);
  assert.match(payload, /sourceBundles\.flatMap\(\(snapshot\) => snapshot\.featureKeys\)/);
  assert.match(bundleSelector, /featureKeysFromPlanBundles\(snapshots\)/);
  assert.match(bundleSelector, /featureKeysFromPlanBundles\(remaining\)/);
  assert.doesNotMatch(bundleSelector, /enabledFeatures\.filter/);
  assert.match(subscriptionLoader, /workspace\?\.workspace_type !== 'personal'/);
  assert.match(subscriptionHook, /refetchInterval: 15_000/);
  assert.match(
    teacherNav,
    /title: 'ปีการศึกษาและภาคเรียน'[\s\S]*featureKey: 'admin\.academic_years'/
  );
  assert.match(teacherNav, /title: 'นักเรียน'[\s\S]*featureKey: 'admin\.students'/);
  assert.match(teacherNav, /title: 'ห้องเรียน'[\s\S]*featureKey: 'admin\.classrooms'/);
  assert.match(teacherNav, /title: 'วิชาและหลักสูตร'[\s\S]*featureKey: 'admin\.subjects'/);
  assert.match(teacherNav, /title: 'ลงทะเบียนนักเรียน'[\s\S]*featureKey: 'admin\.enrollments'/);
  assert.match(teacherNav, /title: 'ประกาศทั้งโรงเรียน'[\s\S]*featureKey: 'admin\.announcements'/);
  assert.match(teacherNav, /title: 'ครู\/บุคลากร'[\s\S]*featureKey: 'admin\.staff'/);
  assert.match(subscriptionActions, /cache: 'no-store'/);
});

test('unfinished Worksheet AI stays hidden from master-admin package controls', () => {
  const featureConfig = read('src/lib/school-subscription-config.ts');
  const teacherNav = read('src/layouts/nav-config-teacher.tsx');
  const masterNav = read('src/layouts/nav-config-master.tsx');
  const appAccess = read('src/lib/ekru-app-access.ts');
  const createView = read('src/sections/subscription-plan/view/subscription-plan-create-view.tsx');
  const editDialog = read(
    'src/sections/subscription-plan/components/subscription-plan-form-dialog.tsx'
  );

  assert.match(featureConfig, /MASTER_ADMIN_SCHOOL_FEATURES = SCHOOL_FEATURES\.filter/);
  assert.match(featureConfig, /feature\.key !== 'teacher\.worksheet_ai'/);
  assert.match(createView, /MASTER_ADMIN_SCHOOL_FEATURES/);
  assert.match(editDialog, /MASTER_ADMIN_SCHOOL_FEATURES/);
  assert.match(createView, /Worksheet AI ยังอยู่ระหว่างพัฒนา/);
  assert.match(editDialog, /Worksheet AI ยังอยู่ระหว่างพัฒนา/);
  assert.doesNotMatch(teacherNav, /WORKSHEET_AI/);
  assert.match(masterNav, /title: 'Worksheet AI \(พัฒนา\)'/);
  assert.match(masterNav, /path: '\/launch\?app=WORKSHEET_AI'/);
  assert.match(appAccess, /app\.code === 'WORKSHEET_AI' && caller\.role !== 'master_admin'/);
  assert.match(appAccess, /app\.code === 'WORKSHEET_AI' && caller\.role === 'master_admin'/);
});

test('client session requests include cookies and clear a rejected session', () => {
  const actions = read('src/auth/context/jwt/action.ts');
  const provider = read('src/auth/context/jwt/auth-provider.tsx');
  const axiosClient = read('src/lib/axios.ts');

  assert.match(provider, /fetch\('\/api\/auth\/me', \{ credentials: 'include' \}\)/);
  assert.match(provider, /response\.status === 401 && !isAuthPage/);
  assert.match(provider, /await signOut\(\)/);
  assert.match(provider, /window\.location\.replace\(paths\.auth\.jwt\.signIn\)/);
  assert.match(actions, /credentials: 'include'/);
  assert.match(axiosClient, /withCredentials: true/);
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
  assert.match(source, /Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups'/);
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
  const searchFunction = read('supabase/migrations/20260724010000_search_teacher_assignments.sql');
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
