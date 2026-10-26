import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
class LineLoginError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
function setup({
  claims = {},
  profile = {},
  verifyStatus = 200,
  profileStatus = 200,
  networkError = false,
  malformed = false,
} = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/lib/line-access-token.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      URL,
      Buffer,
      AbortSignal,
      require(name) {
        if (name === 'server-only') return {};
        if (name === './line-login') return { LineLoginError };
        if (name === 'node:https')
          return {
            request: (url, options, callback) => {
              calls.push({ url: new URL(url), options });
              const req = new EventEmitter();
              req.destroy = () => req.emit('error', new Error('transport error'));
              req.end = () =>
                queueMicrotask(() => {
                  if (networkError) {
                    req.emit('error', new Error('network with sensitive URL'));
                    return;
                  }
                  const res = new EventEmitter();
                  const verify = url.pathname.endsWith('/verify');
                  res.statusCode = verify ? verifyStatus : profileStatus;
                  res.resume = () => {};
                  callback(res);
                  res.emit(
                    'data',
                    Buffer.from(
                      malformed
                        ? 'not-json'
                        : JSON.stringify(
                            verify
                              ? {
                                  client_id: '2012217961',
                                  expires_in: 300,
                                  scope: 'profile',
                                  ...claims,
                                }
                              : {
                                  userId: 'Uverified-server-user',
                                  displayName: 'Verified Name',
                                  ...profile,
                                }
                          )
                    )
                  );
                  res.emit('end');
                });
              return req;
            },
          };
        throw new Error(name);
      },
    }
  );
  return {
    verify: (token) =>
      exports.verifyLineAccessToken(
        { channelId: '2012217961', liffId: '2012217961-zWHJVvh5' },
        token
      ),
    calls,
  };
}
test('access token audience and expiry are verified before fetching identity directly from LINE', async () => {
  const s = setup();
  const result = await s.verify('private-access-token');
  assert.equal(result.subject, 'Uverified-server-user');
  assert.equal(s.calls.length, 2);
  assert.equal(s.calls[0].url.origin, 'https://api.line.me');
  assert.equal(s.calls[0].url.pathname, '/oauth2/v2.1/verify');
  assert.equal(s.calls[0].url.searchParams.get('access_token'), 'private-access-token');
  assert.equal(s.calls[1].url.href, 'https://api.line.me/v2/profile');
  assert.equal(s.calls[1].options.headers.Authorization, 'Bearer private-access-token');
});
for (const options of [
  { claims: { client_id: 'marketplace-channel' } },
  { claims: { expires_in: 0 } },
  { claims: { expires_in: -1 } },
  { claims: { expires_in: '300' } },
  { claims: { scope: 'openid' } },
  { verifyStatus: 401 },
  { verifyStatus: 302 },
  { networkError: true },
  { malformed: true },
])
  test('invalid token never fetches profile ' + JSON.stringify(options), async () => {
    const s = setup(options);
    await assert.rejects(
      s.verify('private-token'),
      (error) =>
        !error.message.includes('private-token') && !error.message.includes('sensitive URL')
    );
    assert.equal(s.calls.length, 1);
  });
for (const options of [
  { profile: { userId: null } },
  { profile: { userId: '' } },
  { profileStatus: 403 },
  { profileStatus: 302 },
])
  test('unverified profile cannot become a session ' + JSON.stringify(options), async () => {
    const s = setup(options);
    await assert.rejects(s.verify('token'));
  });
test('header injection and empty tokens fail before making any LINE requests', async () => {
  const s = setup();
  for (const token of ['', null, 'token\r\nInjected: header'])
    await assert.rejects(s.verify(token));
  assert.equal(s.calls.length, 0);
});
