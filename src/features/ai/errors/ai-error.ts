import type { AIErrorCode } from '../types/ai.types';

const AI_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  AI_DISABLED: 'ระบบ AI ถูกปิดใช้งานชั่วคราว',
  AI_NOT_CONFIGURED: 'ยังไม่ได้ตั้งค่าระบบ AI',
  AI_RATE_LIMITED: 'มีการเรียกใช้งานถี่เกินไป กรุณาลองใหม่',
  AI_QUOTA_EXCEEDED: 'คุณใช้สิทธิ์สร้าง Template ด้วย AI ครบตามจำนวนที่กำหนดแล้ว',
  AI_INVALID_INPUT: 'ข้อมูลที่ส่งให้ AI ไม่ถูกต้อง',
  AI_INVALID_OUTPUT: 'AI ส่งข้อมูลกลับมาไม่ครบ กรุณาสร้างใหม่',
  AI_PROVIDER_ERROR: 'ไม่สามารถเชื่อมต่อบริการ AI ได้',
  AI_TIMEOUT: 'การสร้างใช้เวลานานเกินกำหนด',
  AI_CONTENT_REJECTED: 'เนื้อหาที่ระบุไม่สามารถประมวลผลได้',
};

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    options?: { cause?: unknown; status?: number }
  ) {
    super(AI_ERROR_MESSAGES[code], { cause: options?.cause });
    this.name = 'AIError';
    this.status = options?.status ?? AIError.defaultStatus(code);
  }

  readonly status: number;

  private static defaultStatus(code: AIErrorCode) {
    if (code === 'AI_INVALID_INPUT') return 400;
    if (code === 'AI_DISABLED' || code === 'AI_NOT_CONFIGURED') return 503;
    if (code === 'AI_RATE_LIMITED') return 429;
    if (code === 'AI_QUOTA_EXCEEDED') return 429;
    if (code === 'AI_CONTENT_REJECTED') return 422;
    if (code === 'AI_INVALID_OUTPUT') return 502;
    if (code === 'AI_TIMEOUT') return 504;
    return 502;
  }
}

export function publicAIError(error: unknown) {
  if (error instanceof AIError) return error;
  if (error instanceof Error && (error.name === 'AbortError' || /timeout/i.test(error.message))) {
    return new AIError('AI_TIMEOUT', { cause: error });
  }
  return new AIError('AI_PROVIDER_ERROR', { cause: error });
}
