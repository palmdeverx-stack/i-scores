import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('route authenticates, checks feature/config, rate limit and quota before OpenAI', () => {
  const source = read('src/app/api/ai/templates/generate/route.ts');
  const auth = source.indexOf('requireLessonPlanFeature');
  const enabled = source.indexOf('templateEnabled');
  const configured = source.indexOf('OPENAI_API_KEY');
  const rate = source.indexOf('enforceTemplateAIRateLimit(caller.sub)');
  const quota = source.indexOf('enforceTemplateAIQuota(caller.sub)');
  const generate = source.indexOf('generateTemplateWithAI(caller, input)');
  assert.ok(auth >= 0 && auth < enabled && enabled < configured);
  assert.ok(configured < rate && rate < quota && quota < generate);
});

test('provider uses Responses API strict JSON schema and never returns raw provider errors', () => {
  const provider = [
    read('src/features/ai/providers/openai.provider.ts'),
    read('src/features/ai/providers/openai-provider-core.ts'),
  ].join('\n');
  const errors = read('src/features/ai/errors/ai-error.ts');
  assert.match(provider, /responses\.create/);
  assert.match(provider, /type: 'json_schema'/);
  assert.match(provider, /strict: true/);
  assert.match(provider, /store: false/);
  assert.doesNotMatch(errors, /secret provider payload/);
});

test('invalid output gets at most one repair attempt and timeout has a stable mapping', () => {
  const service = read('src/features/ai/services/template-ai.service.ts');
  const errors = read('src/features/ai/errors/ai-error.ts');
  assert.match(service, /attempt < 2/);
  assert.match(service, /ซ่อมเพียงครั้งเดียว/);
  assert.match(errors, /AI_TIMEOUT/);
  assert.match(errors, /เวลานานเกินกำหนด/);
});

test('usage migration contains quota metadata but no prompt/content columns', () => {
  const migration = read('supabase/migrations/20260804110000_template_ai.sql');
  assert.match(migration, /create table if not exists public\.ai_usage_logs/);
  assert.match(migration, /input_tokens integer/);
  assert.match(migration, /idempotency_key uuid/);
  assert.doesNotMatch(migration, /prompt\s+text/i);
  assert.doesNotMatch(migration, /content\s+jsonb/i);
});

test('preview apply only fills the form and cancel never creates a template', () => {
  const dialog = read('src/features/ai/components/template-ai-dialog.tsx');
  const form = read('src/features/templates/view/template-form-view.tsx');
  assert.match(dialog, /onApply\(result/);
  assert.match(dialog, /onClick=\{onClose\}/);
  assert.match(form, /setValue\('content', result\.content/);
  assert.match(form, /บันทึก Template/);
  assert.doesNotMatch(dialog, /createTemplate\(/);
});

test('client bundle contains no OpenAI API key or OpenAI SDK call', () => {
  const client = [
    read('src/features/ai/template-ai-actions.ts'),
    read('src/features/ai/components/template-ai-dialog.tsx'),
  ].join('\n');
  assert.doesNotMatch(client, /OPENAI_API_KEY/);
  assert.doesNotMatch(client, /from ['"]openai['"]/);
  assert.match(client, /\/api\/ai\/templates\/generate/);
});
