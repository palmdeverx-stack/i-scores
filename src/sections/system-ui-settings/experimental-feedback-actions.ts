'use client';

// ----------------------------------------------------------------------

export type ExperimentalFeedbackCategory = 'positive' | 'problem' | 'add' | 'remove';

export async function submitExperimentalFeedback(params: {
  menuPath: string;
  pagePath: string;
  category: ExperimentalFeedbackCategory;
  message: string;
}): Promise<void> {
  const response = await fetch('/api/system/experimental-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถส่งฟีดแบ็กได้');
}
