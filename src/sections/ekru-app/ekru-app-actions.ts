'use client';

// ----------------------------------------------------------------------

export type EkruApp = {
  id: string;
  code: string;
  name: string;
  launch_path: string;
  required_feature_key: string;
  supported_scope: 'individual' | 'school' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EkruAppInput = {
  code: string;
  name: string;
  launchPath: string;
  requiredFeatureKey: string;
  supportedScope: EkruApp['supported_scope'];
  isActive: boolean;
};

async function parse(response: Response) {
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถจัดการระบบย่อยได้');
  return json;
}

export async function listEkruApps(): Promise<EkruApp[]> {
  return (await parse(await fetch('/api/master/apps'))).apps;
}

export async function createEkruApp(input: EkruAppInput): Promise<EkruApp> {
  return (
    await parse(
      await fetch('/api/master/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    )
  ).app;
}

export async function updateEkruApp(id: string, input: EkruAppInput): Promise<EkruApp> {
  return (
    await parse(
      await fetch(`/api/master/apps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    )
  ).app;
}

export async function deleteEkruApp(id: string): Promise<void> {
  await parse(await fetch(`/api/master/apps/${id}`, { method: 'DELETE' }));
}
