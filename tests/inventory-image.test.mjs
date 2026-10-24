import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/app/api/inventory/[id]/image/route.ts', import.meta.url),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const id = '33333333-3333-4333-8333-333333333333';
const context = { params: Promise.resolve({ id }) };
function setup({ allowed = true, found = true } = {}) {
  const calls = [];
  const exports = {};
  const db = {
    from() {
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          calls.push([key, value]);
          return query;
        },
        update() {
          return query;
        },
        async maybeSingle() {
          return { data: found ? { id, image_path: 'school/item/photo.png' } : null };
        },
      };
      return query;
    },
    storage: {
      from() {
        return {
          async upload(path) {
            calls.push(['upload', path]);
            return {};
          },
          async remove() {
            return {};
          },
          async createSignedUrl() {
            calls.push(['signed']);
            return { data: { signedUrl: 'https://example.com/private-image' } };
          },
        };
      },
    },
  };
  vm.runInNewContext(compiled, {
    exports,
    File,
    Buffer,
    crypto,
    require(name) {
      if (name === 'src/lib/auth-token')
        return { requireRole: () => ({ schoolId: 'school', sub: 'teacher', role: 'teacher' }) };
      if (name === 'src/lib/supabase-admin') return { supabaseAdmin: db };
      if (name === 'src/lib/department-permission-access')
        return {
          canManageViaPermission: async () => allowed,
          canViewViaPermission: async () => allowed,
        };
      return require(name);
    },
  });
  return { ...exports, calls };
}
function upload(file) {
  const form = new FormData();
  form.append('file', file);
  return new Request('http://localhost/api/inventory/image', { method: 'POST', body: form });
}
test('unauthorized teachers cannot read, upload or remove images', async () => {
  const api = setup({ allowed: false });
  assert.equal((await api.GET(new Request('http://localhost'), context)).status, 404);
  assert.equal(
    (await api.POST(upload(new File(['bad'], 'x.png', { type: 'image/png' })), context)).status,
    403
  );
  assert.equal((await api.DELETE(new Request('http://localhost'), context)).status, 403);
  assert.equal(api.calls.length, 0);
});
test('images in another school cannot be uploaded', async () => {
  const api = setup({ found: false });
  assert.equal(
    (await api.POST(upload(new File(['bad'], 'x.png', { type: 'image/png' })), context)).status,
    403
  );
  assert.ok(api.calls.some(([key, value]) => key === 'school_id' && value === 'school'));
  assert.ok(!api.calls.some(([key]) => key === 'upload'));
});
test('rejects disguised files and files over 5 MB', async () => {
  const api = setup();
  for (const file of [
    new File(['not a PNG'], 'x.png', { type: 'image/png' }),
    new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(5242881)], 'big.png', { type: 'image/png' }),
  ]) {
    assert.equal((await api.POST(upload(file), context)).status, 400);
  }
  assert.ok(!api.calls.some(([key]) => key === 'upload'));
});
test('image access is school scoped and does not cache signed redirects', async () => {
  const api = setup();
  const response = await api.GET(new Request('http://localhost'), context);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.ok(api.calls.some(([key, value]) => key === 'school_id' && value === 'school'));
});

test('valid image upload is stored under the authenticated school and item', async () => {
  const api = setup();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV7sAAAAASUVORK5CYII=',
    'base64'
  );
  const response = await api.POST(
    upload(new File([png], 'photo.png', { type: 'image/png' })),
    context
  );
  assert.equal(response.status, 200);
  const path = api.calls.find(([key]) => key === 'upload')[1];
  assert.ok(path.startsWith(`school/${id}/`));
  assert.ok(path.endsWith('.png'));
});
