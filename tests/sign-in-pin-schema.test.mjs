import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';

const source = fs.readFileSync('src/auth/view/jwt/sign-in-schema.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  createRequire(import.meta.url),
  module,
  module.exports
);
const { SignInSchema, SignInPinSchema } = module.exports;

test('Google PIN submission accepts empty hidden username and password fields', () => {
  assert.equal(
    SignInPinSchema.safeParse({ username: '', password: '', pin: '01234567' }).success,
    true
  );
});

test('PIN validation rejects missing, short, long and nonnumeric values', () => {
  for (const pin of ['', '1234567', '123456789', '1234567a']) {
    const result = SignInPinSchema.safeParse({ username: '', password: '', pin });
    assert.equal(result.success, false);
    assert.deepEqual(
      result.error.issues.map((issue) => issue.path),
      [['pin']]
    );
  }
});

test('password login still requires username and password', () => {
  assert.equal(SignInSchema.safeParse({ username: '', password: '', pin: '' }).success, false);
  assert.equal(
    SignInSchema.safeParse({ username: 'teacher', password: 'example-password', pin: '' }).success,
    true
  );
});

test('password-based administrator challenge accepts PIN', () => {
  assert.equal(
    SignInPinSchema.safeParse({ username: 'admin', password: 'example-password', pin: '12345678' })
      .success,
    true
  );
});
