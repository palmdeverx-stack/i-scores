import 'server-only';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type SecurityAuditInput = {
  action: string;
  actorUserId?: string | null;
  schoolId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  request?: Request;
  metadata?: Record<string, unknown>;
};

export async function writeSecurityAudit(input: SecurityAuditInput): Promise<void> {
  const { error } = await supabaseAdmin.from('security_audit_log').insert({
    action: input.action,
    actor_user_id: input.actorUserId ?? null,
    school_id: input.schoolId ?? null,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    ip_address: input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: input.request?.headers.get('user-agent')?.slice(0, 500) ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) console.error('Security audit write failed', error);
}
