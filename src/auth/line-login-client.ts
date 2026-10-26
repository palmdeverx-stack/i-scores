import { getLineLoginMessage } from 'src/lib/line-login-messages';

export type LiffLoginClient = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config: { redirectUri: string }) => void;
  getIDToken: () => string | null;
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
  const idToken = liff.getIDToken();
  if (!idToken)
    throw new Error('ไม่พบ ID token จาก LINE กรุณาเปิดสิทธิ์ openid และยืนยันการเข้าสู่ระบบ');
  await post('/api/auth/line/start', { intent: 'resume', expectedIntent });
  const result = await post('/api/auth/line/verify', { idToken });
  if (!['/teacher', '/teacher/profile?lineLogin=pending'].includes(result.redirectTo))
    throw new Error('ปลายทางเข้าสู่ระบบไม่ถูกต้อง');
  return result.redirectTo as string;
}
