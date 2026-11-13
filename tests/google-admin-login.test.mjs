import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = fs.readFileSync('src/app/api/auth/google/route.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const lookup of ['linked', 'email']) {
  test(`Google master_admin reaches PIN despite broken personal licenses (${lookup})`, async () => {
    let recoveries = 0;
    const admin = {
      id: 'admin-id',
      role: 'master_admin',
      is_active: true,
      auth_user_id: 'google-id',
      email: 'admin@example.com',
      school: null,
    };
    const dependencies = {
      'next/server': {
        NextResponse: {
          json: (body, options) => ({
            body,
            status: options?.status ?? 200,
            cookies: {
              delete() {},
              set() {
                assert.fail('Session issued before PIN');
              },
            },
          }),
        },
      },
      'src/lib/supabase-admin': {
        supabaseAdmin: {
          auth: {
            getUser: async () => ({
              data: {
                user: {
                  id: 'google-id',
                  email: admin.email,
                  app_metadata: { provider: 'google' },
                  user_metadata: {},
                },
              },
            }),
          },
          from(table) {
            assert.equal(table, 'app_users');
            let emailLookup = false;
            const query = {
              select() {
                return this;
              },
              eq() {
                return this;
              },
              ilike() {
                emailLookup = true;
                return this;
              },
              neq() {
                return this;
              },
              then(resolve, reject) {
                return Promise.resolve({
                  data: emailLookup === (lookup === 'email') ? [admin] : [],
                }).then(resolve, reject);
              },
            };
            return query;
          },
        },
      },
      'src/lib/marketplace-profile': { ensureMarketplaceUser: async () => ({ id: 'buyer' }) },
      'src/lib/personal-workspace-provisioning': {
        recoverPersonalWorkspacePurchases: async () => {
          recoveries += 1;
          throw new Error('Unable to map the individual license to an EKRU subscription plan');
        },
      },
      'src/lib/school-subscription': {
        isSchoolAccessUsable() {
          assert.fail('Master admin needs no school license');
        },
      },
      'src/lib/staff-supabase-auth': { syncLinkedStaffAuth: async () => ({ ok: true }) },
      'src/lib/marketplace-invitations': {},
      'src/lib/auth-token': {
        signPinChallenge: () => 'pin-challenge',
        ACCESS_TOKEN_COOKIE: 'session',
      },
    };
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(
      (name) => {
        assert.ok(name in dependencies, name);
        return dependencies[name];
      },
      module,
      module.exports
    );
    const response = await module.exports.POST(
      new Request('http://localhost/api/auth/google', {
        method: 'POST',
        headers: { authorization: 'Bearer verified-google-token' },
      })
    );
    assert.equal(recoveries, 0);
    assert.equal(response.status, 200);
    assert.equal(response.body.requiresPin, true);
    assert.equal(response.body.role, 'master_admin');
    assert.equal(response.body.pinChallengeToken, 'pin-challenge');
  });
}
