export async function readGoogleAuthResponse(response: Response) {
  if (response.status === 431) {
    throw new Error(
      'ข้อมูลที่เบราว์เซอร์ส่งมามีขนาดเกินกำหนด กรุณาล้างคุกกี้ของเว็บไซต์นี้ หรือเปิดหน้าต่างไม่ระบุตัวตนแล้วลองเข้าสู่ระบบอีกครั้ง'
    );
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new Error(result?.message ?? 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง');
  }

  return result;
}
