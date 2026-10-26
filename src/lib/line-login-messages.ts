export const LINE_LOGIN_MESSAGES: Record<string, string> = {
  profile_permission_required:
    'LINE ยังไม่อนุญาตสิทธิ์ profile กรุณาเปิด MINI App และอนุญาตข้อมูลโปรไฟล์ก่อนเข้าสู่ระบบ',
  not_configured: 'ยังไม่ได้เปิดใช้งาน LINE Login',
  not_linked:
    'LINE นี้ยังไม่ได้เชื่อมบัญชีครู กรุณาเข้าสู่ระบบเดิม แล้วเชื่อม LINE Login ในหน้าโปรไฟล์ก่อน',
  invalid_state: 'คำขอ LINE หมดอายุหรือไม่ตรงกับเบราว์เซอร์นี้ กรุณาเริ่มใหม่',
  line_verification_failed: 'ตรวจสอบตัวตนกับ LINE ไม่สำเร็จ กรุณาลองใหม่',
  existing_login_required:
    'กรุณาเข้าสู่ระบบด้วยรหัสผ่านหรือ Google ของบัญชีครูเดิมก่อนเชื่อม/ยกเลิก LINE Login',
  session_changed: 'บัญชีหรือ session เปลี่ยนระหว่างเชื่อม LINE กรุณาเริ่มใหม่',
  password_change_required: 'กรุณาเปลี่ยนรหัสผ่านที่ระบบกำหนดก่อนเชื่อม LINE Login',
  account_unavailable: 'บัญชีครูถูกปิดใช้งานหรือไม่มีสิทธิ์เข้าสู่ระบบ',
  school_unavailable: 'โรงเรียนถูกปิดใช้งาน',
  license_unavailable: 'แพ็กเกจโรงเรียนหมดอายุหรือถูกระงับ กรุณาติดต่อผู้ดูแล',
  link_conflict: 'LINE นี้หรือบัญชีครูนี้เชื่อมไว้แล้ว กรุณาตรวจสอบบัญชี',
  cancelled: 'ยกเลิกการยืนยันกับ LINE แล้ว',
  service_unavailable: 'ระบบไม่พร้อมใช้งาน กรุณาลองใหม่',
};

export function getLineLoginMessage(code: string | null | undefined): string {
  return code && Object.hasOwn(LINE_LOGIN_MESSAGES, code) ? LINE_LOGIN_MESSAGES[code] : '';
}
