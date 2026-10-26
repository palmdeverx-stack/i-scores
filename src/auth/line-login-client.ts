import { getLineLoginMessage } from 'src/lib/line-login-messages';

export type LiffLoginClient = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config: { redirectUri: string }) => void;
  getIDToken: () => string | null;
  permission?: {
    query: (
      scope: 'openid' | 'profile'
    ) => Promise<{ state: 'granted' | 'prompt' | 'unavailable' }>;
    requestAll: () => Promise<void>;
  };
};

export async function completeLiffLogin(liff: LiffLoginClient, liffId: string) {
  // LIFF must process its primary/secondary redirect before reading or changing the URL.
  await liff.init({ liffId });
  const expectedIntent =
    new URLSearchParams(window.location.search).get('intent') === 'link' ? 'link' : 'login';
  if (!liff.isLoggedIn()) {
    const endpoint = new URL('/auth/line', window.location.origin);
    if (expectedIntent === 'link') endpoint.searchParams.set('intent', 'link');
    liff.login({ redirectUri: endpoint.href });
    return null;
  }
  const post = async (url: string, body: Record<string, string>) => {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(getLineLoginMessage(data.code) || 'เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่');
    return data;
  };
  let idToken = liff.getIDToken();
  if (!idToken && liff.permission) {
    const openid = await liff.permission.query('openid');
    if (openid.state === 'unavailable') {
      throw new Error(
        'LINE channel นี้ไม่มีสิทธิ์ openid กรุณาตรวจ LIFF ID และการตั้งค่าของ stage ที่กำลังใช้งาน'
      );
    }
    const profile = await liff.permission.query('profile');
    // MINI Apps may defer consent. Request only when consent is missing:
    // requestAll rejects when all permissions have already been granted.
    if (openid.state === 'prompt' || profile.state === 'prompt') {
      try {
        await liff.permission.requestAll();
      } catch {
        throw new Error(
          'ยังไม่ได้ยืนยันสิทธิ์กับ LINE กรุณาเปิด MINI App ผ่าน LINE แล้วอนุญาตการเข้าสู่ระบบ'
        );
      }
      // Consent can refresh credentials. Never keep the token read before consent.
      idToken = liff.getIDToken();
    }
  }
  if (!idToken)
    throw new Error(
      'LINE ยังไม่ส่ง ID token กรุณาปิด MINI App แล้วเปิดใหม่ผ่าน LINE และตรวจว่า LIFF ID ตรงกับ stage ที่ใช้งาน'
    );
  await post('/api/auth/line/start', { intent: 'resume', expectedIntent });
  const result = await post('/api/auth/line/verify', { idToken });
  if (!['/teacher', '/teacher/profile?lineLogin=pending'].includes(result.redirectTo))
    throw new Error('ปลายทางเข้าสู่ระบบไม่ถูกต้อง');
  return result.redirectTo as string;
}
