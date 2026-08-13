'use client';

// ----------------------------------------------------------------------

export type SystemUiSettings = {
  experimentalMenuPaths: string[];
  updatedAt: string | null;
  storageReady?: boolean;
};

async function parseResponse(response: Response): Promise<SystemUiSettings> {
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถจัดการการตั้งค่าหน้าตาได้');
  return json;
}

export async function getSystemUiSettings(): Promise<SystemUiSettings> {
  return parseResponse(await fetch('/api/system/ui-settings', { cache: 'no-store' }));
}

export async function updateSystemUiSettings(
  experimentalMenuPaths: string[]
): Promise<SystemUiSettings> {
  return parseResponse(
    await fetch('/api/system/ui-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experimentalMenuPaths }),
    })
  );
}
