import { ZodError } from 'zod';
import { NextResponse } from 'next/server';

import { aiConfig } from 'src/features/ai/config/ai.config';
import { generateTemplateRequestSchema } from 'src/features/ai/schemas';
import { AIError, publicAIError } from 'src/features/ai/errors/ai-error';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { generateTemplateWithAI } from 'src/features/ai/services/template-ai.service';
import { enforceTemplateAIRateLimit } from 'src/features/ai/services/ai-rate-limit.service';
import {
  getTemplateAIQuota,
  beginTemplateAIUsage,
  finishTemplateAIUsage,
  enforceTemplateAIQuota,
} from 'src/features/ai/services/ai-usage.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ code: 'AI_INVALID_INPUT', message: 'ไม่มีสิทธิ์ใช้งาน AI' }, { status: 403 });
  }
  if (!aiConfig.templateEnabled) {
    const error = new AIError('AI_DISABLED');
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    const error = new AIError('AI_NOT_CONFIGURED');
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 150_000) {
    const error = new AIError('AI_INVALID_INPUT');
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }

  let usageId: string | undefined;
  const startedAt = Date.now();
  try {
    const input = generateTemplateRequestSchema.parse(await request.json());
    await enforceTemplateAIRateLimit(caller.sub);
    await enforceTemplateAIQuota(caller.sub);
    usageId = await beginTemplateAIUsage(
      { userId: caller.sub, schoolId: caller.schoolId },
      { action: input.action, templateType: input.templateType, idempotencyKey: input.idempotencyKey }
    );
    const generated = await generateTemplateWithAI(caller, input);
    await finishTemplateAIUsage(usageId, {
      status: 'success',
      durationMs: Date.now() - startedAt,
      ...generated.telemetry,
    });
    const quota = await getTemplateAIQuota(caller.sub);
    return NextResponse.json({ result: { ...generated.result, quota } });
  } catch (error) {
    const safeError =
      error instanceof ZodError
        ? new AIError('AI_INVALID_INPUT', { cause: error })
        : publicAIError(error);
    if (usageId) {
      await finishTemplateAIUsage(usageId, {
        status: 'error',
        durationMs: Date.now() - startedAt,
        errorCode: safeError.code,
      });
    }
    return NextResponse.json(
      { code: safeError.code, message: safeError.message },
      { status: safeError.status }
    );
  }
}
