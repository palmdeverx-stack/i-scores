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
