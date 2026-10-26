import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function load(path, mocks = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require(name) {
        if (name in mocks) return mocks[name];
        if (name === 'react/jsx-runtime')
          return {
            jsx: (type, props) => ({ type, props }),
            jsxs: (type, props) => ({ type, props }),
          };
        throw new Error(name);
      },
    }
  );
  return exports;
}
const { paths } = load('src/routes/paths.ts');
const homes = load('src/auth/utils/role-home-path.ts', { 'src/routes/paths': { paths } });
for (const [role, expected] of [
  ['teacher', '/teacher'],
  ['school_admin', '/admin'],
  ['master_admin', '/master'],
  ['student', '/student'],
  ['marketplace_user', '/account/apps'],
  [undefined, '/auth/jwt/sign-in'],
]) {
  test(`home and sign-in default for ${role} is ${expected}`, async () => {
    assert.equal(homes.getHomePathForRole(role), expected);
    const redirects = [];
    const effects = [];
    const { GuestGuard } = load('src/auth/guard/guest-guard.tsx', {
      react: { useState: (value) => [value, () => {}], useEffect: (fn) => effects.push(fn) },
      'minimal-shared/utils': { safeReturnUrl: (value, fallback) => value || fallback },
      'src/routes/hooks': {
        useRouter: () => ({ replace: (url) => redirects.push(url) }),
        useSearchParams: () => ({ get: () => null }),
      },
      'src/components/loading-screen': { SplashScreen: 'splash' },
      '../hooks': {
        useAuthContext: () => ({
          user: role ? { role } : null,
          loading: false,
          authenticated: !!role,
        }),
      },
      '../utils/role-home-path': homes,
    });
    GuestGuard({ children: 'signin' });
    for (const effect of effects) await effect();
    assert.deepEqual(redirects, role ? [expected] : []);
  });
}
test('opening the student root with a Marketplace session leads to recovery, not 403 or teacher rights', async () => {
  const layouts = load('src/app/(home)/layout.tsx', {
    'src/layouts/main': { MainLayout: 'student-layout' },
    'src/layouts/nav-config-student': { studentNavData: [] },
    'src/auth/hooks': { useAuthContext: () => ({ user: { role: 'marketplace_user' } }) },
    'src/auth/guard': {
      AuthGuard: 'auth',
      RoleRedirectGuard: 'role',
      MustChangePasswordGuard: 'password',
    },
  });
  const tree = layouts.default({ children: 'home' });
  const guard = tree.props.children;
  assert.equal(guard.type, 'role');
  assert.deepEqual(Array.from(guard.props.allowedRoles), ['student']);
  const redirects = [];
  const effects = [];
  const { RoleRedirectGuard } = load('src/auth/guard/role-redirect-guard.tsx', {
    react: { useEffect: (fn) => effects.push(fn) },
    'src/routes/hooks': { useRouter: () => ({ replace: (url) => redirects.push(url) }) },
    'src/components/loading-screen': { SplashScreen: 'splash' },
    '../utils/role-home-path': homes,
  });
  const result = RoleRedirectGuard(guard.props);
  assert.equal(result.type, 'splash');
  for (const effect of effects) await effect();
  assert.deepEqual(redirects, ['/account/apps']);
});
