import 'server-only';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type ApprovalSignatureFields = {
  signature_url?: string | null;
  signature_path?: string | null;
  submitter_signature_url?: string | null;
  submitter_signature_path?: string | null;
};

async function signedSignatureUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from('schedule-approval-signatures')
    .createSignedUrl(path, 60);
  return error ? null : (data?.signedUrl ?? null);
}

export async function signApprovalUrls<T extends ApprovalSignatureFields>(approval: T) {
  const [signatureUrl, submitterSignatureUrl] = await Promise.all([
    signedSignatureUrl(approval.signature_path),
    signedSignatureUrl(approval.submitter_signature_path),
  ]);
  const safe: ApprovalSignatureFields = { ...approval };
  delete safe.signature_path;
  delete safe.submitter_signature_path;
  return {
    ...safe,
    signature_url: signatureUrl,
    submitter_signature_url: submitterSignatureUrl,
  };
}

export async function signApprovalList<T extends ApprovalSignatureFields>(approvals: T[]) {
  return Promise.all(approvals.map(signApprovalUrls));
}
