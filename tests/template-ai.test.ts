import test from 'node:test';
import assert from 'node:assert/strict';

import { zodTextFormat } from 'openai/helpers/zod';

import { AIError, publicAIError } from '../src/features/ai/errors/ai-error.ts';
import { buildTemplateTask } from '../src/features/ai/prompts/template-prompts.ts';
import { OpenAIProviderCore } from '../src/features/ai/providers/openai-provider-core.ts';
import {
  AI_CONTENT_SCHEMAS,
  getGenerateTemplateResponseSchema,
} from '../src/features/ai/schemas/generate-template-response.schema.ts';
import {
  hasValidRubricWeights,
  areIndicatorsAllowed,
  isActivityDurationAllowed,
} from '../src/features/ai/services/template-ai-rules.ts';

test('prompt builder keeps template-specific rules separate', () => {
  const rubric = buildTemplateTask('rubric', 'generate');
  const activity = buildTemplateTask('learning_activity', 'shorten');
  assert.match(rubric, /น้ำหนักรวม 100/);
  assert.match(activity, /เวลาไม่เกิน/);
  assert.notEqual(rubric, activity);
});

test('all AI response schemas convert to strict Structured Outputs JSON Schema', () => {
  for (const type of [
    'learning_objective', 'essential_content', 'learning_content', 'learning_activity',
    'assessment', 'rubric', 'media', 'question', 'reflection', 'lesson_plan',
  ] as const) {
    const format = zodTextFormat(getGenerateTemplateResponseSchema(type), `test_${type}`);
    assert.equal(format.type, 'json_schema');
    assert.equal(format.strict, true);
    assert.equal(format.schema.additionalProperties, false);
  }
});

test('rubric weights are absent or complete and total 100', () => {
  assert.equal(hasValidRubricWeights([{ weight: 40 }, { weight: 60 }]), true);
  assert.equal(hasValidRubricWeights([{ weight: 40 }, { weight: 50 }]), false);
  assert.equal(hasValidRubricWeights([{ weight: 100 }, {}]), false);
  assert.equal(hasValidRubricWeights([{}, {}]), true);
});

test('successful rubric and activity payloads pass their AI Zod schemas', () => {
  const rubric = AI_CONTENT_SCHEMAS.rubric.safeParse({
    rubricType: 'analytic', scoreType: 'score', maximumScore: 4, passingScore: 2,
    criteria: [{
      id: 'criterion-1', name: 'ความถูกต้อง', description: null, weight: 100,
      levels: [
        { id: 'level-1', level: 1, label: 'ปรับปรุง', score: 1, description: 'มีข้อผิดพลาดหลายจุด' },
        { id: 'level-2', level: 2, label: 'ผ่าน', score: 4, description: 'ถูกต้องครบถ้วน' },
      ],
    }],
  });
  const activity = AI_CONTENT_SCHEMAS.learning_activity.safeParse({
    activityName: 'ทดลองและอภิปราย', teachingMethod: 'สืบเสาะ', phase: 'practice',
    durationMinutes: 50, objectives: ['อธิบายผลการทดลองได้'], teacherActions: ['ตั้งคำถาม'],
    studentActions: ['ทดลองเป็นกลุ่ม'], requiredMaterials: ['อุปกรณ์ทดลอง'],
    expectedOutputs: ['บันทึกผล'], groupType: 'group',
  });
  assert.equal(rubric.success, true);
  assert.equal(activity.success, true);
});

test('activity duration cannot exceed the request limit', () => {
  assert.equal(isActivityDurationAllowed(50, 60), true);
  assert.equal(isActivityDurationAllowed(61, 60), false);
});

test('indicator IDs must be a subset of the server allowlist', () => {
  assert.equal(areIndicatorsAllowed(['one'], ['one', 'two']), true);
  assert.equal(areIndicatorsAllowed(['invented'], ['one', 'two']), false);
});

test('AI errors expose stable Thai messages and hide raw provider errors', () => {
  const mapped = publicAIError(new Error('secret provider payload'));
  assert.equal(mapped.code, 'AI_PROVIDER_ERROR');
  assert.equal(mapped.message, 'ไม่สามารถเชื่อมต่อบริการ AI ได้');
  assert.equal(new AIError('AI_TIMEOUT').status, 504);
});

test('OpenAI provider sends strict Responses API input through a mocked client', async () => {
  let captured: Record<string, unknown> | undefined;
  const provider = new OpenAIProviderCore(
    () => ({
      responses: {
        create: async (input) => {
          captured = input;
          return {
            status: 'completed',
            output_text: '{"ok":true}',
            output: [],
            model: 'mock-model',
            id: 'resp_mock',
            usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
          };
        },
      },
    }),
    { model: 'mock-model', maxOutputTokens: 500 }
  );
  const result = await provider.generateStructuredOutput<unknown, { ok: boolean }>({
    task: 'mock task',
    instructions: 'mock instructions',
    input: { topic: 'test' },
    schemaName: 'mock_schema',
    jsonSchema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
      additionalProperties: false,
    },
  });
  const format = (captured?.text as { format: { strict: boolean } }).format;
  assert.equal(format.strict, true);
  assert.equal(captured?.store, false);
  assert.deepEqual(result.data, { ok: true });
  assert.equal(result.usage?.totalTokens, 12);
});

test('mocked OpenAI invalid JSON and timeout map to stable error codes', async () => {
  const invalid = new OpenAIProviderCore(
    () => ({
      responses: {
        create: async () => ({
          status: 'completed', output_text: '{', output: [], model: 'mock', id: 'bad',
        }),
      },
    }),
    { model: 'mock', maxOutputTokens: 500 }
  );
  await assert.rejects(
    invalid.generateStructuredOutput({
      task: '', instructions: '', input: {}, schemaName: 'x', jsonSchema: {},
    }),
    (error: AIError) => error.code === 'AI_INVALID_OUTPUT'
  );

  const timeout = new OpenAIProviderCore(
    () => ({
      responses: {
        create: async () => {
          const error = new Error('timed out');
          error.name = 'AbortError';
          throw error;
        },
      },
    }),
    { model: 'mock', maxOutputTokens: 500 }
  );
  await assert.rejects(
    timeout.generateStructuredOutput({
      task: '', instructions: '', input: {}, schemaName: 'x', jsonSchema: {},
    }),
    (error: AIError) => error.code === 'AI_TIMEOUT'
  );
});
